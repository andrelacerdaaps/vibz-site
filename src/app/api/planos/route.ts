import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // Garante que a lista de preços esteja sempre atualizada

export async function GET() {
  try {
    // Busca todos os planos ordenados por preço (removido o filtro 'ativo' que não existe no banco)
    const planos = await prisma.plano.findMany({
      orderBy: { preco: 'asc' }
    });

    return NextResponse.json({ planos });
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar planos" },
      { status: 500 }
    );
  }
}