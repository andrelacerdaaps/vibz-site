import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Mantendo sua configuração do Prisma para não dar erro de conexão
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// 1. LISTAR (GET)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ erro: "userId é obrigatório" }, { status: 400 });
    }

    // Busca todas as mídias (Removemos o filtro de data para você ver tudo no painel por enquanto)
    // Se quiser filtrar só os ativos, descomente a parte do 'expiresAt'
    const midias = await prisma.midia.findMany({
      where: {
        userId: userId,
        // status: "APPROVED", // Traz tudo para você poder gerenciar
      },
      orderBy: { dataPost: "desc" } // Mais novos primeiro
    });

    return NextResponse.json(midias);
  } catch (error) {
    console.error("ERRO GET MIDIA:", error);
    return NextResponse.json({ erro: "Erro ao buscar mídias" }, { status: 500 });
  }
}

// 2. SALVAR (POST) - Mantive igual ao seu, está correto
export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data.userId || !data.url) {
      return NextResponse.json({ erro: "Dados incompletos" }, { status: 400 });
    }

    const agora = new Date();
    const expiresAt = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

    const novaMidia = await prisma.midia.create({
      data: {
        url: data.url,
        tipo: data.tipo || "IMAGE",
        autor: data.autor ? data.autor.replace("@", "").trim() : "cliente",
        avatar: data.avatar || "",
        duracao: data.duracao || 10,
        userId: data.userId,
        status: "APPROVED",
        dataPost: agora,
        expiresAt
      }
    });

    return NextResponse.json(novaMidia);
  } catch (error) {
    console.error("ERRO POST MIDIA:", error);
    return NextResponse.json({ erro: "Erro ao salvar mídia" }, { status: 500 });
  }
}

// 3. DELETAR DE VERDADE (DELETE) - AQUI ESTÁ A MUDANÇA
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ erro: "ID faltando" }, { status: 400 });
    }

    // A. Primeiro buscamos a mídia para saber o nome do arquivo
    const midia = await prisma.midia.findUnique({ where: { id } });

    if (midia) {
        // B. Se for um arquivo local (começa com /stories/), apaga da pasta
        if (midia.url.startsWith("/stories/")) {
            const filePath = path.join(process.cwd(), "public", midia.url);
            // Verifica se o arquivo existe antes de tentar apagar
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath); // Deleta o arquivo físico do computador
                } catch (err) {
                    console.error("Erro ao apagar arquivo físico:", err);
                }
            }
        }
    }

    // C. Agora sim, apaga do Banco de Dados para sempre
    await prisma.midia.delete({
      where: { id }
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("ERRO DELETE MIDIA:", error);
    return NextResponse.json({ erro: "Erro ao remover" }, { status: 500 });
  }
}