import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Cria a conexão com o banco
const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const userId = searchParams.get("state"); 
    const error = searchParams.get("error");

    // 1. Verificações de segurança
    if (error) {
      return NextResponse.json({ error: "Permissão negada pelo usuário." }, { status: 400 });
    }

    if (!code || !userId) {
      return NextResponse.json({ error: "Código ou ID do usuário faltando." }, { status: 400 });
    }

    // Carrega as chaves do .env
    const clientId = process.env.META_APP_ID;
    const clientSecret = process.env.META_APP_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const redirectUri = `${baseUrl}/api/auth/meta/callback`;

    // 2. Troca o 'code' pelo Token de Acesso (Curta duração)
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.json({ error: "Erro ao gerar token inicial", details: tokenData.error }, { status: 400 });
    }

    const shortToken = tokenData.access_token;

    // 3. Troca pelo Token de Longa Duração (60 dias)
    const longTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortToken}`;
    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();
    
    // Se der erro no longo, usa o curto mesmo
    const finalToken = longTokenData.access_token || shortToken;

    // 4. Busca as Páginas na API
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${finalToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    // Tenta achar na lista
    let pageWithInsta = pagesData.data?.find((p: any) => p.instagram_business_account);

    // 5. O "Pulo do Gato": Se não veio na lista, busca direto pelo ID da Vuppz
    if (!pageWithInsta) {
        console.log("Tentando buscar Vuppz via ID direto...");
        const vuppzId = "959639483905069"; // ID da sua página Vuppz
        const directUrl = `https://graph.facebook.com/v19.0/${vuppzId}?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${finalToken}`;
        
        const directRes = await fetch(directUrl);
        const directData = await directRes.json();

        if (directData.id && directData.instagram_business_account) {
            pageWithInsta = directData; // ACHAMOS A PÁGINA!
        }
    }

    if (!pageWithInsta) {
      return NextResponse.json({
        status: "ERRO_PERSISTENTE",
        mensagem: "Não conseguimos achar a conta Vuppz nem buscando pelo ID direto.",
        detalhe_api: pagesData,
      }, { status: 404 });
    }

    const instagramData = pageWithInsta.instagram_business_account;

    // 6. SALVAR NO BANCO DE DADOS
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessTokenMeta: finalToken,            
        instagramBusinessId: instagramData.id,  
        instagramUser: instagramData.username,  
        logoUrl: instagramData.profile_picture_url || null, 
        statusConta: "ATIVO"                    
      }
    });

    // 7. Redireciona para a Home (/) com mensagem de sucesso
    return NextResponse.redirect(`${baseUrl}/?conexao=sucesso`);

  } catch (error) {
    console.error("Erro Fatal no Callback:", error);
    return NextResponse.json({ error: "Erro interno no servidor", details: String(error) }, { status: 500 });
  }
}