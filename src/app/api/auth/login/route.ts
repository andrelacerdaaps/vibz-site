import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Agora importamos daquele arquivo seguro
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { email, senha } = data;

    // Busca o usuário no banco
    const usuario = await prisma.user.findUnique({
      where: { email },
      include: { plano: true } 
    });

    if (!usuario) {
      return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 400 });
    }

    // Verifica a senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return NextResponse.json({ erro: "Senha incorreta." }, { status: 400 });
    }

    // --- VERIFICAÇÃO DE VALIDADE ---
    let statusAtual = usuario.statusConta;
    
    // Admin nunca vence e verificamos se existe data de validade
    if (usuario.validadePlano && usuario.role !== 'ADMIN') { 
        const hoje = new Date();
        const validade = new Date(usuario.validadePlano);
        
        if (hoje > validade) {
            statusAtual = 'PENDENTE';
            // Atualiza no banco silenciosamente
            await prisma.user.update({
                where: { id: usuario.id },
                data: { statusConta: 'PENDENTE' }
            });
        }
    }

    return NextResponse.json({ 
      sucesso: true, 
      usuario: { 
        id: usuario.id,
        nome: usuario.nomeEmpresa,
        email: usuario.email,
        statusConta: statusAtual,
        role: usuario.role,
        plano: usuario.plano ? usuario.plano.nome : null,
        planoAtivo: usuario.planoAtivo, // Adicionei para garantir que o front receba
        validade: usuario.validadePlano 
      } 
    });

  } catch (error) {
    // Esse console.error vai mostrar o erro real nos logs da Hostinger
    console.error("ERRO CRÍTICO NO LOGIN:", error);
    return NextResponse.json({ erro: "Erro interno no servidor." }, { status: 500 });
  }
}