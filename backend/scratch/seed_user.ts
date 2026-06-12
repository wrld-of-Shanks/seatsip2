import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDb, prisma } from '../src/db';

async function main() {
  await initDb();
  const email = 'shankardarur0@gmail.com';
  const name = 'Shankar Darur';
  const password = 'password123';
  const passwordHash = bcrypt.hashSync(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists.`);
    return;
  }

  await prisma.user.create({
    data: {
      id: uuidv4(),
      name,
      email,
      phone: '+91-9999999999',
      password_hash: passwordHash,
      role: 'USER',
      wallet_balance: 1000,
      loyalty_points: 200,
      loyalty_tier: 'silver',
    },
  });

  console.log(`Successfully created user:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
