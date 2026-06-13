const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.menuItem.findMany();
  console.log(JSON.stringify(items.map(i => ({
    id: i.id,
    name: i.name,
    cafe_id: i.cafe_id,
    explore_category: i.explore_category,
    price: i.price,
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
