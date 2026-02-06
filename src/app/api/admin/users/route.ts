import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Evita erros de conexão excessiva no Next.js (Padrão Singleton)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// --- 1. BUSCAR DADOS (GET) ---
export async function GET() {
  try {
    const users = await prisma.user.findMany({ 
        include: { plano: true }, 
        orderBy: { createdAt: 'desc' } 
    });
    
    const planos = await prisma.plano.findMany();
    const cupons = await prisma.cupom.findMany();

    const totalUsuarios = users.length;
    const ativos = users.filter(u => u.statusConta === 'ATIVO').length;
    
    const faturamento = users.reduce((acc, user) => {
      if (user.statusConta === 'ATIVO' && user.plano) return acc + user.plano.preco;
      return acc;
    }, 0);

    return NextResponse.json({ 
        users, 
        planos, 
        cupons, 
        stats: { totalUsuarios, ativos, faturamento } 
    });

  } catch (error) {
    console.error("Erro no GET /api/admin/users:", error);
    return NextResponse.json({ erro: "Erro ao buscar dados" }, { status: 500 });
  }
}

// --- 2. ATUALIZAR E AÇÕES (PUT) ---
export async function PUT(request: Request) {
  try {
    const data = await request.json();

    // --- AÇÃO: VINCULAR INSTAGRAM ---
    if (data.id && data.instagramUser) {
        // Limpa o handle: remove "@", espaços e converte para minúsculas
        const handleLimpo = data.instagramUser.replace("@", "").trim().toLowerCase();

        const user = await prisma.user.update({
            where: { id: data.id },
            data: { 
                instagramUser: handleLimpo,
                // Ajustado para salvar o link direto do perfil do Instagram
                logoUrl: `https://www.instagram.com/${handleLimpo}`
            }
        });
        return NextResponse.json(user);
    }

    // 1. DAR 7 DIAS GRÁTIS
    if (data.acao === 'DAR_TESTE') {
        const hoje = new Date();
        const dataVencimento = new Date(hoje);
        dataVencimento.setDate(hoje.getDate() + 7);

        const user = await prisma.user.update({
            where: { id: data.userId },
            data: { 
                statusConta: 'ATIVO',
                planoId: null,
                validadePlano: dataVencimento,
                testeGratisUsado: true 
            }
        });
        return NextResponse.json(user);
    }

    // 2. ALTERAR STATUS MANUALMENTE
    if (data.acao === 'ALTERAR_STATUS') {
      const user = await prisma.user.update({
        where: { id: data.userId },
        data: { statusConta: data.novoStatus }
      });
      return NextResponse.json(user);
    }

    // 3. CRIAR PLANO
    if (data.acao === 'CRIAR_PLANO') {
      const novoPlano = await prisma.plano.create({
        data: {
          nome: data.nome,
          preco: parseFloat(data.preco),
          tipoCobranca: data.tipo,
          liberaVideo: data.video,
          liberaLayout: data.layout
        }
      });
      return NextResponse.json(novoPlano);
    }

    // 4. CRIAR CUPOM
    if (data.acao === 'CRIAR_CUPOM') {
      const novoCupom = await prisma.cupom.create({
        data: {
          codigo: data.codigo.toUpperCase(),
          desconto: parseFloat(data.desconto),
          tipo: data.tipo,
        }
      });
      return NextResponse.json(novoCupom);
    }

    return NextResponse.json({ erro: "Ação desconhecida" }, { status: 400 });

  } catch (error) {
    console.error("ERRO NO PUT /api/admin/users:", error);
    return NextResponse.json({ erro: "Erro interno no servidor" }, { status: 500 });
  }
}

// --- 3. DELETAR (DELETE) ---
export async function DELETE(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const tipo = searchParams.get("tipo");
      const id = searchParams.get("id");
  
      if (!id) return NextResponse.json({ erro: "ID faltando" }, { status: 400 });
  
      if (tipo === 'plano') await prisma.plano.delete({ where: { id } });
      if (tipo === 'cupom') await prisma.cupom.delete({ where: { id } });
  
      return NextResponse.json({ sucesso: true });
    } catch (error) {
      console.error("Erro no DELETE /api/admin/users:", error);
      return NextResponse.json({ erro: "Erro ao deletar" }, { status: 500 });
    }
}