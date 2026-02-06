import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { email, senha } = data;

    const usuario = await prisma.user.findUnique({
      where: { email },
      include: { plano: true } 
    });

    if (!usuario) {
      return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 400 });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return NextResponse.json({ erro: "Senha incorreta." }, { status: 400 });
    }

    // --- VERIFICAÇÃO DE VALIDADE ---
    let statusAtual = usuario.statusConta;
    if (usuario.validadePlano && usuario.role !== 'ADMIN') { // Admin nunca vence
        const hoje = new Date();
        const validade = new Date(usuario.validadePlano);
        if (hoje > validade) {
            statusAtual = 'PENDENTE';
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
        role: usuario.role, // <--- AQUI ESTÁ O SEGREDO! MANDAMOS O CARGO
        plano: usuario.plano ? usuario.plano.nome : null,
        validade: usuario.validadePlano 
      } 
    });

  } catch (error) {
    return NextResponse.json({ erro: "Erro no servidor." }, { status: 500 });
  }
}