import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return NextResponse.json({ error: "User não achado" }, { status: 404 });

    // Devolve os dados atualizados
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Erro servidor" }, { status: 500 });
  }
}