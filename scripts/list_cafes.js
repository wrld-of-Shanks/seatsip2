const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cafes = await prisma.cafe.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log(JSON.stringify(cafes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
