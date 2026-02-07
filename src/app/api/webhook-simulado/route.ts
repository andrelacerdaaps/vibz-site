import { NextResponse } from "next/server";
// Aqui eu ajustei para usar a conexão segura que criamos no src/lib/prisma.ts
// Isso evita erros no servidor, mas mantém o funcionamento idêntico.
import { prisma } from "@/lib/prisma"; 

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId } = data;

    // 1. Busca os seus dados reais no banco de dados
    const usuario = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!usuario) {
      return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });
    }

    const handle = usuario.instagramUser || "cliente_vibz";

    // 2. Simula um link de compartilhamento real do Instagram
    // Isso cria uma URL no formato que você solicitou
    const storyIdMock = Math.floor(Math.random() * 1000000000000000000);
    const linkCompartilhamento = `https://www.instagram.com/stories/${handle}/${storyIdMock}?utm_source=ig_story_item_share`;

    // Foto vertical de alta qualidade para a TV
    const fotoVertical = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=987&auto=format&fit=crop';

    // 3. Cria a mídia usando o SEU @ e a SUA foto de perfil salva
    const novoStory = await prisma.midia.create({
      data: {
        tipo: 'IMAGE',
        url: fotoVertical, 
        autor: handle, // Salva o nome limpo
        avatar: usuario.logoUrl || `https://unavatar.io/instagram/${handle}`, // Usa a foto do perfil
        duracao: 10,
        userId: userId,
        status: 'APPROVED',
        // A LINHA ABAIXO FOI A ÚNICA LÓGICA NOVA ADICIONADA (Obrigatória pelo Banco de Dados)
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) 
      }
    });

    return NextResponse.json({ sucesso: true, story: novoStory, linkOriginal: linkCompartilhamento });

  } catch (error) {
    console.error("Erro no simulador:", error);
    return NextResponse.json({ erro: "Erro ao simular" }, { status: 500 });
  }
}