const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update Espresso, Cappuccino, Cold Brew to have explore categories
  await prisma.menuItem.updateMany({
    where: { name: 'Espresso' },
    data: { explore_category: 'brew-bar' }
  });

  await prisma.menuItem.updateMany({
    where: { name: 'Cold Brew' },
    data: { explore_category: 'brew-bar' }
  });

  await prisma.menuItem.updateMany({
    where: { name: 'Cappuccino' },
    data: { explore_category: 'brew-bar' }
  });

  await prisma.menuItem.updateMany({
    where: { name: 'Avocado Toast' },
    data: { explore_category: 'matcha-moments' }
  });

  // For the cafe owner's item, tag it with sweet-cravings or matcha-moments
  await prisma.menuItem.updateMany({
    where: { cafe_id: '7454accc-f461-4e6c-96c8-8d3c623b8159' },
    data: { explore_category: 'sweet-cravings' }
  });

  console.log('Seeded explore categories on existing items!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
