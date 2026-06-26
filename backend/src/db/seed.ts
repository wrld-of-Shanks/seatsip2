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
    prisma.redeemedReward.deleteMany(),
    prisma.reward.deleteMany(),
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
      {
        name: 'Espresso',
        desc: 'Rich, concentrated single shot of espresso.',
        price: 80,
        cat: 'Hot Beverages',
        veg: true,
        popular: true,
        cal: 5,
        explore_category: 'brew-bar',
        img: 'https://images.unsplash.com/photo-1510707577719-0d85973dd3f4?w=400',
      },
      {
        name: 'Cappuccino',
        desc: 'Espresso with velvety steamed milk foam.',
        price: 180,
        cat: 'Hot Beverages',
        veg: true,
        popular: true,
        cal: 120,
        explore_category: 'brew-bar',
        img: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400',
      },
      {
        name: 'Cold Brew',
        desc: '18-hour slow-steeped specialty cold brew.',
        price: 220,
        cat: 'Cold Beverages',
        veg: true,
        popular: true,
        cal: 15,
        explore_category: 'brew-bar',
        img: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400',
      },
      {
        name: 'Avocado Toast',
        desc: 'Multigrain toast with smashed fresh avocado and herbs.',
        price: 280,
        cat: 'Food',
        veg: true,
        popular: true,
        cal: 320,
        explore_category: null,
        img: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=400',
      },
      {
        name: 'Matcha Latte',
        desc: 'Creamy steamed milk with premium stone-ground organic Uji matcha.',
        price: 240,
        cat: 'Hot Beverages',
        veg: true,
        popular: true,
        cal: 150,
        explore_category: 'matcha-moments',
        img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400',
      },
      {
        name: 'Iced Matcha Espresso',
        desc: 'A gorgeous layered drink with matcha, cold milk, and a double shot of espresso.',
        price: 260,
        cat: 'Cold Beverages',
        veg: true,
        popular: true,
        cal: 180,
        explore_category: 'matcha-moments',
        img: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400',
      },
      {
        name: 'Chocolate Waffle',
        desc: 'Warm Belgian waffle topped with Belgian chocolate syrup and vanilla ice cream.',
        price: 250,
        cat: 'Food',
        veg: true,
        popular: true,
        cal: 480,
        explore_category: 'sweet-cravings',
        img: 'https://images.unsplash.com/photo-1562376502-6f769499c886?w=400',
      },
      {
        name: 'Blueberry Cheesecake',
        desc: 'Classic rich cream cheese filling on graham cracker crust with sweet blueberry topping.',
        price: 280,
        cat: 'Food',
        veg: true,
        popular: true,
        cal: 420,
        explore_category: 'sweet-cravings',
        img: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400',
      },
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
          image_url: item.img,
          explore_category: item.explore_category,
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

  const rewards = [
    {
      id: '1',
      name: 'Free artisan coffee',
      icon: '☕',
      category: 'Food & Drink',
      points_cost: 150,
      tier_required: 'SILVER',
      description: 'Enjoy a free freshly brewed artisan coffee of your choice.',
    },
    {
      id: '2',
      name: 'Phone-free booth (1 hr)',
      icon: '📵',
      category: 'Experience',
      points_cost: 300,
      tier_required: 'SILVER',
      description: 'Reserve a quiet, phone-free booth for concentration or reading.',
    },
    {
      id: '3',
      name: 'Pastry + coffee combo',
      icon: '🍰',
      category: 'Food & Drink',
      points_cost: 400,
      tier_required: 'GOLD',
      description: 'Get any coffee paired with a fresh pastry from our bakery counter.',
    },
    {
      id: '4',
      name: 'Priority window seat',
      icon: '🪟',
      category: 'Experience',
      points_cost: 500,
      tier_required: 'GOLD',
      description: 'Get priority access to book or occupy our premium window seating areas.',
    },
    {
      id: '5',
      name: 'Detox Day Pass',
      icon: '🧘',
      category: 'Experience',
      points_cost: 1000,
      tier_required: 'PLATINUM',
      description: 'Enjoy full day-pass access to our partner wellness and detox center.',
    },
    {
      id: '6',
      name: 'Branded journal',
      icon: '📓',
      category: 'Merch',
      points_cost: 800,
      tier_required: 'PLATINUM',
      description: 'A beautiful custom-branded leather-bound journal for notes and ideas.',
    },
    {
      id: '7',
      name: 'Bring a friend free',
      icon: '👥',
      category: 'Experience',
      points_cost: 1200,
      tier_required: 'PLATINUM',
      description: 'Reserve a workspace and bring a guest completely free of charge.',
    },
    {
      id: '8',
      name: 'Custom drink named after you',
      icon: '🍹',
      category: 'Food & Drink',
      points_cost: 2000,
      tier_required: 'PLATINUM',
      description: 'Collaborate with our barista to create a custom signature drink named after you.',
    },
  ];

  for (const reward of rewards) {
    await prisma.reward.create({
      data: {
        ...reward,
        stock: -1,
        is_active: true,
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('   - 3 users (test: arjun@example.com / password123, admin: admin@seatsip.com / admin123)');
  console.log(`   - ${cafes.length} cafes with menus, tables, and reviews`);
  console.log(`   - ${rewards.length} loyalty rewards`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
