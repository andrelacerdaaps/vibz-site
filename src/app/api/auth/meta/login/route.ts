import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Erro: ID do usuário é obrigatório." },
        { status: 400 }
      );
    }

    // Carregando variáveis
    const clientId = process.env.META_APP_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    // --- MUDANÇA AQUI: Scopes fixos no código para garantir que não vai "email" ---
    const scopes = "instagram_basic,pages_show_list,instagram_manage_insights,pages_read_engagement";
    
    const redirectUri = `${baseUrl}/api/auth/meta/callback`;

    if (!clientId || !baseUrl) {
      return NextResponse.json(
        { error: "Faltam configurações no .env (ID ou URL Base)" },
        { status: 500 }
      );
    }

    // Montar a URL
    const metaLoginUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${userId}&scope=${scopes}&response_type=code`;

    return NextResponse.redirect(metaLoginUrl);

  } catch (error) {
    console.error("Erro na rota de login:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}