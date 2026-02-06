import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ erro: "ID ausente" }, { status: 400 });
    }

    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        instagramUser: true,
        accessTokenMeta: true,
        instagramBusinessId: true,
        logoUrl: true
      }
    });

    if (!usuario?.accessTokenMeta || !usuario?.instagramBusinessId) {
      return NextResponse.json(
        { erro: "Conta Instagram não conectada corretamente." },
        { status: 404 }
      );
    }

    // 🔹 Busca stories na Meta
    const fields = "media_url,media_type,thumbnail_url,timestamp";
    const urlMeta = `https://graph.facebook.com/v18.0/${usuario.instagramBusinessId}/stories?fields=${fields}&access_token=${usuario.accessTokenMeta}`;

    const response = await fetch(urlMeta, { cache: "no-store" });
    const dadosMeta = await response.json();

    if (dadosMeta.error) {
      console.error("Erro Token:", dadosMeta.error);
      // Se der erro de token, pode ser que expirou
      return NextResponse.json({ erro: "Token inválido ou expirado." }, { status: 401 });
    }

    if (!dadosMeta.data || dadosMeta.data.length === 0) {
      return NextResponse.json({
        sucesso: true,
        total: 0,
        aviso: "Nenhum story ativo encontrado."
      });
    }

    // 📁 Pasta para salvar mídias
    const uploadDir = path.join(process.cwd(), "public", "stories");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let totalSalvo = 0;

    for (const item of dadosMeta.data) {
      const dataPostagem = new Date(item.timestamp);

      // 🔥 O PULO DO GATO (ANTI-DUPLICAÇÃO) 🔥
      // Verifica no banco se já existe uma mídia desse usuário com EXATAMENTE a mesma data de postagem
      const jaExiste = await prisma.midia.findFirst({
        where: {
            userId: userId,
            dataPost: dataPostagem // Compara a data original do Instagram
        }
      });

      // Se já existe, pula para o próximo sem baixar nem salvar nada
      if (jaExiste) {
        continue;
      }

      // --- SE CHEGOU AQUI, É UM STORY NOVO ---

      const mediaResponse = await fetch(item.media_url);
      const buffer = Buffer.from(await mediaResponse.arrayBuffer());

      const ext = item.media_type === "VIDEO" ? "mp4" : "jpg";
      const fileName = `story_${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      const expiresAt = new Date(
        dataPostagem.getTime() + 24 * 60 * 60 * 1000
      );

      await prisma.midia.create({
        data: {
          url: `/stories/${fileName}`,
          tipo: item.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
          duracao: item.media_type === "VIDEO" ? 15 : 10,
          autor: usuario.instagramUser || "Vibz TV",
          avatar: usuario.logoUrl || "https://i.pravatar.cc/150",
          userId: userId,
          status: "APPROVED",
          dataPost: dataPostagem, // Salva a data original para conferir depois
          expiresAt
        }
      });

      totalSalvo++;
    }

    return NextResponse.json({
      sucesso: true,
      total: totalSalvo,
      mensagem: totalSalvo > 0 ? `${totalSalvo} novos stories baixados!` : "Nenhum story novo."
    });

  } catch (error: any) {
    console.error("ERRO SYNC STORIES:", error.message);
    return NextResponse.json(
      { erro: error.message || "Erro na sincronização." },
      { status: 500 }
    );
  }
}