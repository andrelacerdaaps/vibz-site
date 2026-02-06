import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Cadastrando os Planos no VIBZ...')

  // --- 1. PLANOS MENSAIS (Academias e Lojas) ---
  // Esses renovam todo mês
  
  await prisma.plano.create({
    data: {
      nome: 'Básico (Só Fotos)',
      preco: 100.00,
      tipoCobranca: 'MENSAL',
      permiteVideo: false
    }
  })

  await prisma.plano.create({
    data: {
      nome: 'Ouro (Foto + Vídeo)',
      preco: 197.00,
      tipoCobranca: 'MENSAL',
      permiteVideo: true
    }
  })

  await prisma.plano.create({
    data: {
      nome: 'Barraca de Praia VIP',
      preco: 650.00,
      tipoCobranca: 'MENSAL',
      permiteVideo: true
    }
  })

  // --- 2. PLANOS DIÁRIOS (Eventos e Prefeitura) ---
  // Esses cortam o sinal quando acaba o evento

  await prisma.plano.create({
    data: {
      nome: 'Festa 15 Anos / Casamento (Diária)',
      preco: 500.00,
      tipoCobranca: 'DIARIA',
      permiteVideo: true
    }
  })

  await prisma.plano.create({
    data: {
      nome: 'Eventos Políticos / Grandes (Diária)',
      preco: 1500.00,
      tipoCobranca: 'DIARIA',
      permiteVideo: true
    }
  })

  await prisma.plano.create({
    data: {
      nome: 'Pacote Prefeitura (Diária)',
      preco: 2000.00,
      tipoCobranca: 'DIARIA',
      permiteVideo: true
    }
  })

  console.log('✅ Sucesso! Todos os preços foram cadastrados.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })