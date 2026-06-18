import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDb, prisma } from './index';

async function clearAll() {
  await prisma.$transaction([
    prisma.cartItem.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.walletTransaction.deleteMany(),
    prisma.paymentEvent.deleteMany(),
    prisma.review.deleteMany(),
    prisma.order.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.revokedToken.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.menuCategory.deleteMany(),
    prisma.table.deleteMany(),
    prisma.cafe.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seed() {
  await initDb();
  console.log('🌱 Seeding database...');
  await clearAll();

  const passwordHash = bcrypt.hashSync('password123', 10);
  const adminHash = bcrypt.hashSync('admin123', 10);

  const userId1 = uuidv4();
  const userId2 = uuidv4();
  const adminId = uuidv4();

  await prisma.user.createMany({
    data: [
      {
        id: userId1,
        name: 'Arjun Sharma',
        email: 'arjun@example.com',
        phone: '+91-9876543210',
        password_hash: passwordHash,
        role: 'USER',
        wallet_balance: 500,
        loyalty_points: 120,
        loyalty_tier: 'silver',
      },
      {
        id: userId2,
        name: 'Priya Nair',
        email: 'priya@example.com',
        phone: '+91-9876543211',
        password_hash: passwordHash,
        role: 'USER',
        wallet_balance: 250,
        loyalty_points: 85,
        loyalty_tier: 'silver',
      },
      {
        id: adminId,
        name: 'Admin User',
        email: 'admin@seatsip.com',
        phone: '+91-9000000000',
        password_hash: adminHash,
        role: 'ADMIN',
        wallet_balance: 0,
        loyalty_points: 0,
        loyalty_tier: 'silver',
      },
    ],
  });

  const cafes = [
    {
      id: '1',
      name: 'Third Wave Coffee',
      slug: 'third-wave-coffee-indiranagar',
      description: 'Specialty coffee roasters serving single-origin brews in a modern industrial space.',
      address: '942, 12th Main Rd, HAL 2nd Stage',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.6412,
      phone: '+91-80-1234567',
      image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
        'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
      ]),
      rating: 4.6,
      review_count: 342,
      price_level: 3,
      moods: JSON.stringify(['work', 'date', 'chill']),
      tags: JSON.stringify(['specialty-coffee', 'wifi', 'power-outlets', 'quiet']),
      prep_time_minutes: 10,
      open_time: '07:30',
      close_time: '22:00',
    },
    {
      id: '2',
      name: 'Dyu Art Café',
      slug: 'dyu-art-cafe-koramangala',
      description: 'A bohemian art café with rotating art exhibitions, board games, and exceptional pour-overs.',
      address: '23, 1st Cross Rd, KHB Colony, 5th Block, Koramangala',
      city: 'Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245,
      phone: '+91-80-2345678',
      image_url: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800',
        'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
      ]),
      rating: 4.8,
      review_count: 521,
      price_level: 2,
      moods: JSON.stringify(['art', 'creative', 'chill', 'date']),
      tags: JSON.stringify(['art', 'board-games', 'vegan-options', 'instagrammable']),
      prep_time_minutes: 12,
      open_time: '09:00',
      close_time: '23:00',
    },
  ];

  for (const cafe of cafes) {
    await prisma.cafe.create({ data: cafe });

    const tableLayouts = [
      { num: 'T1', cap: 2, floor: 'Ground', x: 10, y: 10 },
      { num: 'T2', cap: 4, floor: 'Ground', x: 30, y: 10 },
      { num: 'T3', cap: 6, floor: 'First', x: 10, y: 10 },
    ];
    await prisma.table.createMany({
      data: tableLayouts.map((t) => ({
        id: uuidv4(),
        cafe_id: cafe.id,
        table_number: t.num,
        capacity: t.cap,
        floor: t.floor,
        position_x: t.x,
        position_y: t.y,
      })),
    });

    const categories = [
      { name: 'Hot Beverages', order: 1 },
      { name: 'Cold Beverages', order: 2 },
      { name: 'Food', order: 3 },
    ];
    const catIds: Record<string, string> = {};
    for (const cat of categories) {
      const catId = uuidv4();
      catIds[cat.name] = catId;
      await prisma.menuCategory.create({
        data: { id: catId, cafe_id: cafe.id, name: cat.name, sort_order: cat.order },
      });
    }

    const items = [
      { name: 'Espresso', desc: 'Rich, concentrated single shot', price: 80, cat: 'Hot Beverages', veg: true, popular: true, cal: 5 },
      { name: 'Cappuccino', desc: 'Espresso with velvety steamed milk foam', price: 180, cat: 'Hot Beverages', veg: true, popular: true, cal: 120 },
      { name: 'Cold Brew', desc: '18-hour slow-steeped cold coffee', price: 220, cat: 'Cold Beverages', veg: true, popular: true, cal: 15 },
      { name: 'Avocado Toast', desc: 'Multigrain toast with smashed avocado', price: 280, cat: 'Food', veg: true, popular: true, cal: 320 },
    ];

    for (const item of items) {
      await prisma.menuItem.create({
        data: {
          id: uuidv4(),
          cafe_id: cafe.id,
          category_id: catIds[item.cat],
          name: item.name,
          description: item.desc,
          price: item.price,
          is_veg: !!item.veg,
          is_popular: !!item.popular,
          prep_time_minutes: 10,
          calories: item.cal,
          image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
        },
      });
    }
  }

  const cafeIds = cafes.map((c) => c.id);
  const reviewTexts = [
    'Amazing coffee and great ambiance! Definitely coming back.',
    'The avocado toast is phenomenal. Staff were super friendly.',
    'Perfect work spot. Fast wifi and the cold brew kept me going all day.',
  ];

  await prisma.review.createMany({
    data: [
      { id: uuidv4(), user_id: userId1, cafe_id: cafeIds[0], rating: 5, comment: reviewTexts[0] },
      { id: uuidv4(), user_id: userId2, cafe_id: cafeIds[0], rating: 4, comment: reviewTexts[1] },
      { id: uuidv4(), user_id: userId1, cafe_id: cafeIds[1], rating: 5, comment: reviewTexts[2] },
      { id: uuidv4(), user_id: userId2, cafe_id: cafeIds[1], rating: 4, comment: reviewTexts[0] },
    ],
  });

  for (const cafeId of cafeIds) {
    const agg = await prisma.review.aggregate({
      where: { cafe_id: cafeId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.cafe.update({
      where: { id: cafeId },
      data: {
        rating: Math.round((agg._avg.rating || 0) * 10) / 10,
        review_count: agg._count.rating,
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('   - 3 users (test: arjun@example.com / password123, admin: admin@seatsip.com / admin123)');
  console.log(`   - ${cafes.length} cafes with menus, tables, and reviews`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
