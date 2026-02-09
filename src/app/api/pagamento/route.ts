import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <--- A CORREÇÃO: Usamos a conexão segura central

// --- SUA CHAVE (MANTIDA) ---
const ACCESS_TOKEN = 'APP_USR-8096434725609568-020320-426ea7fff1c567ab7d8c35336d6b93fd-1571274236';

// --- 1. ROTA DE VERIFICAÇÃO (GET) ---
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id'); // ID da transação do Mercado Pago

        if (!id) return NextResponse.json({ erro: "ID faltando" }, { status: 400 });

        // Pergunta ao Mercado Pago o status real
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        const data = await res.json();

        // Se estiver APROVADO no Mercado Pago, libera no sistema
        if (data.status === 'approved') {
            const userId = data.metadata?.user_id;
            const planoId = data.metadata?.plano_id;

            // Atualiza o status na tabela de pagamentos para aprovado
            await prisma.pagamento.updateMany({
                where: { idTransacaoMP: String(id) },
                data: { status: 'approved' }
            });

            if (userId) {
                const dataValidade = new Date();
                dataValidade.setDate(dataValidade.getDate() + 30); 

                await prisma.user.update({
                    where: { id: userId },
                    data: { 
                        statusConta: 'ATIVO', 
                        planoAtivo: planoId || 'VIBZ PRO', 
                        validadePlano: dataValidade 
                    }
                });
            }
        }

        return NextResponse.json({ status: data.status });
    } catch (error) {
        console.error("ERRO GET PAGAMENTO:", error);
        return NextResponse.json({ erro: "Erro API" }, { status: 500 });
    }
}

// --- 2. ROTA DE CRIAÇÃO (POST) ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, planoId, preco, email, acao } = body;

    // Ação: Teste Grátis
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

    // Ação: Gerar Pix
    const valorFloat = parseFloat(String(preco));
    const dadosPagamento = {
      transaction_amount: valorFloat,
      description: `VIBZ - Plano ${planoId}`,
      payment_method_id: 'pix',
      payer: {
        email: email === 'admin@vibz.com' ? 'test_user_123@test.com' : email,
        first_name: 'Cliente',
        last_name: 'VIBZ'
      },
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
      console.error("Erro MP:", dataMP);
      return NextResponse.json({ erro: "Erro Mercado Pago" }, { status: 400 });
    }

    // Salva a tentativa como 'pending'
    await prisma.pagamento.create({
      data: {
        idTransacaoMP: String(dataMP.id),
        valor: valorFloat,
        userId: userId,
        planoId: planoId,
        status: 'pending'
      }
    });

    return NextResponse.json({
      qr_code: dataMP.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: dataMP.point_of_interaction?.transaction_data?.qr_code_base64,
      id_transacao: dataMP.id 
    });

  } catch (error) {
    console.error("ERRO POST PAGAMENTO:", error);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}