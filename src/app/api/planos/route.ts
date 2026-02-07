import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // Garante que a lista de preços esteja sempre atualizada

export async function GET() {
  try {
    // Vai no banco de dados e busca os planos ativos
    const planos = await prisma.plano.findMany({
      where: { ativo: true },
      orderBy: { preco: 'asc' }
    });

    return NextResponse.json({ planos });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar planos" },
      { status: 500 }
    );
  }
}