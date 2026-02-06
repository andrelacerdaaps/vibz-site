import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId, planoId } = data;

    // Atualiza o usuário com o novo plano e muda o status para ATIVO
    const usuarioAtualizado = await prisma.user.update({
      where: { id: userId },
      data: {
        planoId: planoId,
        statusConta: "ATIVO", // Liberou o acesso!
      },
      include: {
        plano: true, // Traz os dados do plano junto para salvar no navegador
      }
    });

    return NextResponse.json({ 
      sucesso: true, 
      usuario: { 
        id: usuarioAtualizado.id,
        nome: usuarioAtualizado.nomeEmpresa,
        plano: usuarioAtualizado.plano?.nome
      } 
    });

  } catch (error) {
    return NextResponse.json({ erro: "Erro ao processar compra" }, { status: 500 });
  }
}