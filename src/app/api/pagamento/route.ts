import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Evita criar múltiplas instâncias do Prisma em desenvolvimento
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// --- SUA CHAVE DE ACESSO ---
const ACCESS_TOKEN = 'APP_USR-6789075736569699-121918-7dd4a34e8606a4eff23bc481afa73949-1571274236';

// --- 1. VERIFICAR STATUS DO PAGAMENTO (GET) ---
// O site chama essa rota a cada 3 segundos para saber se pagou
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ erro: "ID do pagamento obrigatório" }, { status: 400 });
    }

    // Consulta o Mercado Pago
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    const data = await res.json();

    // Se o pagamento foi aprovado, ativamos o usuário no banco
    if (data.status === 'approved') {
        // Recupera quem é o usuário pelos metadados que enviamos na criação
        const userId = data.metadata?.user_id;
        const planoId = data.metadata?.plano_id;

        if (userId) {
            const dataValidade = new Date();
            dataValidade.setDate(dataValidade.getDate() + 30); // 30 dias de acesso

            await prisma.user.update({
                where: { id: userId },
                data: { 
                    statusConta: 'ATIVO', 
                    plano: planoId || 'VIBZ PRO', // Nome do plano para referência
                    validadePlano: dataValidade 
                }
            });
            console.log(`✅ Usuário ${userId} ativado automaticamente via API!`);
        }
    }

    return NextResponse.json({ 
        status: data.status,
        id: data.id
    });

  } catch (error) {
    console.error("Erro ao verificar status:", error);
    return NextResponse.json({ erro: "Erro ao consultar Mercado Pago" }, { status: 500 });
  }
}

// --- 2. GERAR PIX (POST) ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, planoId, preco, email, acao } = body;

    // --- AÇÃO: SOLICITAR TESTE GRÁTIS ---
    if (acao === 'SOLICITAR_TESTE') {
        const userCheck = await prisma.user.findUnique({ where: { id: userId } });
        
        if (userCheck?.testeGratisUsado) {
             return NextResponse.json({ erro: "Você já usou seu teste grátis." }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { statusConta: 'EM_ANALISE' }
        });

        return NextResponse.json({ sucesso: true });
    }

    // --- AÇÃO: GERAR O PIX ---
    
    // Converte preço para número (garantia)
    const valorFloat = parseFloat(String(preco));

    console.log(`💰 Gerando PIX de R$ ${valorFloat} para User ${userId}...`);

    const dadosPagamento = {
      transaction_amount: valorFloat,
      description: `VIBZ - Plano ${planoId}`,
      payment_method_id: 'pix',
      payer: {
        email: email === 'admin@vibz.com' ? 'test_user_123@test.com' : email,
        first_name: 'Cliente',
        last_name: 'VIBZ'
      },
      // IMPORTANTÍSSIMO: Metadados para identificar o usuário depois
      metadata: {
          user_id: userId,
          plano_id: planoId
      },
      notification_url: "https://vibzplayer.com.br/api/webhook"
    };

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `vibz-${Date.now()}`
      },
      body: JSON.stringify(dadosPagamento)
    });

    const dataMP = await response.json();

    if (!response.ok) {
      console.error("❌ ERRO MERCADO PAGO:", JSON.stringify(dataMP, null, 2));
      return NextResponse.json({ 
        erro: dataMP.message || "Erro de autorização no Mercado Pago" 
      }, { status: 400 });
    }

    console.log("✅ PIX GERADO COM SUCESSO. ID:", dataMP.id);

    return NextResponse.json({
      qr_code: dataMP.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: dataMP.point_of_interaction?.transaction_data?.qr_code_base64,
      payment_id: dataMP.id // Enviamos o ID para o frontend monitorar
    });

  } catch (error) {
    console.error("ERRO SERVIDOR:", error);
    return NextResponse.json({ erro: "Erro interno no servidor" }, { status: 500 });
  }
}