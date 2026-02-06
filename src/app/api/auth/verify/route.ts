import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId, codigo } = await request.json();

    // 1. Busca na tabela temporária PreUser
    const provisorio = await prisma.preUser.findUnique({
      where: { id: userId },
    });

    if (!provisorio) {
      return NextResponse.json({ erro: "Sessão expirada. Tente se cadastrar novamente." }, { status: 404 });
    }

    // 2. Verifica se o código bate
    if (provisorio.codigo === codigo) {
      
      // 3. CRIA O USUÁRIO REAL NA TABELA OFICIAL
      await prisma.user.create({
        data: {
          nomeEmpresa: provisorio.nomeEmpresa,
          email: provisorio.email,
          senha: provisorio.senha,
          emailVerificado: true,
          statusConta: 'PENDENTE',
          // Outros campos padrão que você tiver...
        },
      });

      // 4. Deleta da tabela temporária para limpar o banco
      await prisma.preUser.delete({
        where: { id: userId },
      });

      return NextResponse.json({ sucesso: true });
    }

    return NextResponse.json({ erro: "Código incorreto" }, { status: 400 });
  } catch (error) {
    console.error("Erro na verificação:", error);
    return NextResponse.json({ erro: "Erro ao validar código" }, { status: 500 });
  }
}