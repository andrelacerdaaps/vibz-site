import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🌱 Iniciando cadastro dos planos via API...');

    // Verifica se já existem planos para não duplicar
    const planosExistentes = await prisma.plano.count();
    if (planosExistentes > 0) {
      return NextResponse.json({ 
        mensagem: "O banco já possui planos cadastrados!", 
        total: planosExistentes 
      });
    }

    // --- 1. PLANOS MENSAIS ---
    await prisma.plano.create({
      data: {
        nome: 'Básico (Só Fotos)',
        preco: 100.00,
        tipoCobranca: 'MENSAL',
        liberaVideo: false
      }
    });

    await prisma.plano.create({
      data: {
        nome: 'Ouro (Foto + Vídeo)',
        preco: 197.00,
        tipoCobranca: 'MENSAL',
        liberaVideo: true
      }
    });

    await prisma.plano.create({
      data: {
        nome: 'Barraca de Praia VIP',
        preco: 650.00,
        tipoCobranca: 'MENSAL',
        liberaVideo: true
      }
    });

    // --- 2. PLANOS DIÁRIOS ---
    await prisma.plano.create({
      data: {
        nome: 'Festa 15 Anos / Casamento (Diária)',
        preco: 500.00,
        tipoCobranca: 'DIARIA',
        liberaVideo: true
      }
    });

    await prisma.plano.create({
      data: {
        nome: 'Eventos Políticos / Grandes (Diária)',
        preco: 1500.00,
        tipoCobranca: 'DIARIA',
        liberaVideo: true
      }
    });

    await prisma.plano.create({
      data: {
        nome: 'Pacote Prefeitura (Diária)',
        preco: 2000.00,
        tipoCobranca: 'DIARIA',
        liberaVideo: true
      }
    });

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: "Todos os planos foram cadastrados com sucesso!" 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { erro: "Erro ao cadastrar planos", detalhe: String(error) },
      { status: 500 }
    );
  }
}