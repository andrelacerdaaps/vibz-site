import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { email, senha } = data;

    // Busca o usuário no banco e Traz os dados do Plano junto
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

    // --- CORREÇÃO AQUI ---
    // Definimos qual nome vai aparecer. Se o banco trouxe os dados do plano (relação), usamos o nome oficial.
    // Se não, usamos o campo texto antigo ou "GRATUITO".
    const nomePlanoExibicao = usuario.plano?.nome || usuario.planoAtivo || "GRATUITO";

    return NextResponse.json({ 
      sucesso: true, 
      usuario: { 
        id: usuario.id,
        nome: usuario.nomeEmpresa,
        email: usuario.email,
        statusConta: statusAtual,
        role: usuario.role,
        // Aqui garantimos que o front receba o NOME, e não o ID
        planoAtivo: nomePlanoExibicao, 
        validade: usuario.validadePlano 
      } 
    });

  } 
}