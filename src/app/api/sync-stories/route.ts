import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <--- AQUI ESTÁ A CORREÇÃO: Usamos o arquivo central
import fs from "fs";
import path from "path";

// REMOVI A CRIAÇÃO MANUAL DO PRISMA AQUI PARA NÃO LOTAR O SERVIDOR
// Agora ele usa a conexão única importada na linha 2

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

    const fields = "media_url,media_type,thumbnail_url,timestamp";
    const urlMeta = `https://graph.facebook.com/v18.0/${usuario.instagramBusinessId}/stories?fields=${fields}&access_token=${usuario.accessTokenMeta}`;

    const response = await fetch(urlMeta, { cache: "no-store" });
    const dadosMeta = await response.json();

    if (dadosMeta.error) {
      console.error("Erro Token:", dadosMeta.error);
      return NextResponse.json({ erro: "Token inválido ou expirado." }, { status: 401 });
    }

    if (!dadosMeta.data || dadosMeta.data.length === 0) {
      return NextResponse.json({
        sucesso: true,
        total: 0,
        aviso: "Nenhum story ativo encontrado."
      });
    }

    const uploadDir = path.join(process.cwd(), "public", "stories");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let totalSalvo = 0;

    // Loop mantido idêntico, apenas a conexão do banco agora é segura
    for (const item of dadosMeta.data) {
      const dataPostagem = new Date(item.timestamp);

      const jaExiste = await prisma.midia.findFirst({
        where: {
            userId: userId,
            dataPost: dataPostagem 
        }
      });

      if (jaExiste) {
        continue;
      }

      const mediaResponse = await fetch(item.media_url);
      const buffer = Buffer.from(await mediaResponse.arrayBuffer());

      const ext = item.media_type === "VIDEO" ? "mp4" : "jpg";
      const fileName = `story_${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      // ESTRATÉGIA PORTO SEGURO: Validade de 15 horas
      const expiresAt = new Date(
        dataPostagem.getTime() + 15 * 60 * 60 * 1000
      );

      await prisma.midia.create({
        data: {
          url: `/stories/${fileName}`,
          tipo: item.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
          // ESTRATÉGIA PORTO SEGURO: 10s para vídeo, 5s para foto
          duracao: item.media_type === "VIDEO" ? 10 : 5,
          autor: usuario.instagramUser || "Vibz TV",
          avatar: usuario.logoUrl || "https://i.pravatar.cc/150",
          userId: userId,
          status: "APPROVED",
          dataPost: dataPostagem,
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