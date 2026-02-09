import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <--- AQUI ESTÁ A CORREÇÃO (Importamos o conector seguro)
import fs from "fs";
import path from "path";

// 1. LISTAR (GET)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ erro: "userId é obrigatório" }, { status: 400 });
    }

    // Busca todas as mídias
    const midias = await prisma.midia.findMany({
      where: {
        userId: userId,
        // status: "APPROVED", // Mantive comentado conforme seu original
      },
      orderBy: { dataPost: "desc" } // Mais novos primeiro
    });

    return NextResponse.json(midias);
  } catch (error) {
    console.error("ERRO GET MIDIA:", error);
    return NextResponse.json({ erro: "Erro ao buscar mídias" }, { status: 500 });
  }
}

// 2. SALVAR (POST) - Mantido idêntico ao seu
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

// 3. DELETAR (DELETE) - Mantido idêntico ao seu
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