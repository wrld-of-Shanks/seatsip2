const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
    verification_status: u.verification_status,
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
