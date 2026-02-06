const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@vibz.com";
  const senha = "Chocolate.1596";
  const nome = "Admin Vibz";

  const senhaHash = await bcrypt.hash(senha, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      nomeEmpresa: nome,
      email,
      senha: senhaHash,
      role: "ADMIN",
      statusConta: "ATIVO",
      emailVerificado: true,
    },
  });

  console.log("Admin criado com sucesso!");
  console.log(admin);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
