import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- SUA CHAVE (MANTIDA) ---
const ACCESS_TOKEN = 'APP_USR-6789075736569699-121918-7dd4a34e8606a4eff23bc481afa73949-1571274236';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, planoId, preco, email, acao } = body;

    // --- 1. SOLICITAR TESTE GRÁTIS (NOVO!) ---
    if (acao === 'SOLICITAR_TESTE') {
        // Verifica se já usou o teste antes para evitar abuso
        const userCheck = await prisma.user.findUnique({ where: { id: userId } });
        
        if (userCheck?.testeGratisUsado) {
             return NextResponse.json({ erro: "Você já usou seu teste grátis." }, { status: 400 });
        }

        // Marca o status como "EM_ANALISE" para aparecer no Admin
        await prisma.user.update({
            where: { id: userId },
            data: { statusConta: 'EM_ANALISE' }
        });

        return NextResponse.json({ sucesso: true });
    }

    // --- 2. CONFIRMAÇÃO MANUAL DE PAGAMENTO (WEBHOOK/ADMIN) ---
    if (acao === 'CONFIRMAR_PAGAMENTO') {
        const dataValidade = new Date();
        dataValidade.setDate(dataValidade.getDate() + 31);
        await prisma.user.update({
            where: { id: userId },
            data: { statusConta: 'ATIVO', planoId: planoId, validadePlano: dataValidade }
        });
        return NextResponse.json({ sucesso: true });
    }

    // --- 3. GERAÇÃO DO PIX (MERCADO PAGO) ---
    
    // Tratamento do Preço
    const valorFloat = parseFloat(String(preco));

    console.log(`💰 Gerando PIX de R$ ${valorFloat}...`);

    const dadosPagamento = {
      transaction_amount: valorFloat,
      description: `VIBZ - Plano ${planoId}`,
      payment_method_id: 'pix',
      payer: {
        // Truque de segurança: Se for email do admin, usa um email fake
        email: email === 'admin@vibz.com' ? 'cliente_teste_vendas@test.com' : email,
        first_name: 'Cliente',
        last_name: 'VIBZ'
      },
      notification_url: "https://vibz.com.br/api/webhook"
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

    // SE DER ERRO
    if (!response.ok) {
      console.error("❌ ERRO MERCADO PAGO:", JSON.stringify(dataMP, null, 2));
      return NextResponse.json({ 
        erro: dataMP.message || "Erro de autorização no Mercado Pago" 
      }, { status: 400 });
    }

    console.log("✅ SUCESSO! PIX GERADO.");

    return NextResponse.json({
      qr_code: dataMP.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: dataMP.point_of_interaction?.transaction_data?.qr_code_base64,
      id_transacao: dataMP.id
    });

  } catch (error) {
    console.error("ERRO SERVIDOR:", error);
    return NextResponse.json({ erro: "Erro interno no servidor" }, { status: 500 });
  }
}