import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { nomeEmpresa, email, senha } = data;

    // 1. Verifica se o email já existe na tabela OFICIAL (quem já validou)
    const usuarioAtivo = await prisma.user.findUnique({
      where: { email },
    });

    if (usuarioAtivo) {
      return NextResponse.json(
        { erro: "Este e-mail já está sendo usado por uma conta ativa." },
        { status: 400 }
      );
    }

    const senhaSegura = await bcrypt.hash(senha, 10);
    const codigo4Digitos = Math.floor(1000 + Math.random() * 9000).toString();

    // 2. Cria ou Atualiza na tabela temporária (PreUser)
    // Usamos upsert para se ele tentar de novo, apenas atualizar o código
    const preUsuario = await prisma.preUser.upsert({
      where: { email },
      update: { 
        nomeEmpresa, 
        senha: senhaSegura, 
        codigo: codigo4Digitos 
      },
      create: { 
        nomeEmpresa, 
        email, 
        senha: senhaSegura, 
        codigo: codigo4Digitos 
      },
    });

    // 3. ENVIO DO E-MAIL
    try {
      await transporter.sendMail({
        from: `"VIBZ TV" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `${codigo4Digitos} é o seu código de verificação VIBZ`,
        html: `
          <div style="font-family: sans-serif; max-width: 450px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 24px; margin: auto;">
            <h2 style="color: #2563eb; text-align: center; font-size: 28px;">VIBZ</h2>
            <p style="color: #475569; font-size: 16px;">Olá, <strong>${nomeEmpresa}</strong>!</p>
            <p style="color: #475569; font-size: 16px;">Seu código de ativação chegou. Digite-o para criar sua conta:</p>
            <div style="background: #f1f5f9; padding: 25px; text-align: center; border-radius: 16px; margin: 20px 0;">
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1e40af;">${codigo4Digitos}</span>
            </div>
          </div>
        `,
      });
    } catch (e) { console.error("Erro e-mail:", e); }

    return NextResponse.json({ 
        sucesso: true, 
        id: preUsuario.id,
        codigoDebug: codigo4Digitos 
    });

  } catch (error) {
    return NextResponse.json({ erro: "Erro ao processar registro." }, { status: 500 });
  }
}