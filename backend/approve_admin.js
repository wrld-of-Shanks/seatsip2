const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update all Admin and Cafe Owner users' verification_status to APPROVED so they can log in
  const res = await prisma.user.updateMany({
    where: {
      role: {
        in: ['ADMIN', 'CAFE_OWNER']
      }
    },
    data: { verification_status: 'APPROVED' }
  });
  console.log(`Updated ${res.count} ADMIN and CAFE_OWNER users to APPROVED status.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
