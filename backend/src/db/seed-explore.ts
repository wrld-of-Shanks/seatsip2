import { prisma } from './index';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding Explore Catalog Banners...');

  // 1. Find or create Cafe Owner 'anirudh@gmail.com'
  let user = await prisma.user.findUnique({
    where: { email: 'anirudh@gmail.com' },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash('password123', 12);
    user = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Anirudh',
        email: 'anirudh@gmail.com',
        role: 'CAFE_OWNER',
        password_hash: passwordHash,
        is_active: true,
      },
    });
    console.log(`Created Cafe Owner user: ${user.email}`);
  } else {
    console.log(`Found existing Cafe Owner user: ${user.email}`);
    if (user.role !== 'CAFE_OWNER') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'CAFE_OWNER' },
      });
      console.log(`Updated user role to CAFE_OWNER`);
    }
  }

  // 2. Find or create Cafe 'pinklal' owned by 'anirudh@gmail.com'
  let cafe = await prisma.cafe.findFirst({
    where: { slug: 'pinklal' },
  });

  const exploreMoods = ['matcha_moments', 'sweet_cravings', 'brew_bar', 'earthy'];

  if (!cafe) {
    cafe = await prisma.cafe.create({
      data: {
        id: uuidv4(),
        name: 'pinklal',
        slug: 'pinklal',
        address: '456 Explore Road, Bangalore',
        city: 'Bangalore',
        owner_id: user.id,
        is_open: true,
        is_active: true,
        moods: JSON.stringify(exploreMoods),
      },
    });
    console.log(`Created cafe 'pinklal' (ID: ${cafe.id})`);
  } else {
    console.log(`Found existing cafe 'pinklal' (ID: ${cafe.id})`);
    cafe = await prisma.cafe.update({
      where: { id: cafe.id },
      data: { 
        owner_id: user.id,
        moods: JSON.stringify(exploreMoods),
      },
    });
    console.log(`Updated cafe 'pinklal' owner to ${user.email} and set moods`);
  }

  // 3. Clear existing general/old EXPLORE banners to avoid duplicates on re-run
  const deleted = await prisma.banner.deleteMany({
    where: {
      slider_type: 'EXPLORE',
      OR: [
        { cafe_id: null },
        { cafe_id: cafe.id },
      ],
    },
  });
  console.log(`Cleared ${deleted.count} old explore banners.`);

  // 4. Create the 3 explore categories in ExploreCategory model
  const exploreCategories = [
    {
      id: uuidv4(),
      name: 'Matcha Moments',
      slug: 'matcha-moments',
      description: 'Smooth, earthy matcha creations crafted for a refreshing and calming experience.',
      tag: 'Premium',
      tag_color: '#2D6A4F',
      tag_bg: 'rgba(45,106,79,0.2)',
      image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?q=80&w=800&auto=format&fit=crop',
      sort_order: 1,
    },
    {
      id: uuidv4(),
      name: 'Sweet Cravings',
      slug: 'sweet-cravings',
      description: 'Decadent desserts, fluffy waffles, creamy cakes, and treats made to satisfy every craving.',
      tag: 'Sweet',
      tag_color: '#7B4F00',
      tag_bg: 'rgba(123,79,0,0.2)',
      image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=800&auto=format&fit=crop',
      sort_order: 2,
    },
    {
      id: uuidv4(),
      name: 'Brew Bar',
      slug: 'brew-bar',
      description: 'Freshly brewed coffees, iced blends, and handcrafted café favorites for every mood.',
      tag: 'Classic',
      tag_color: '#7A1A00',
      tag_bg: 'rgba(122,26,0,0.2)',
      image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop',
      sort_order: 3,
    },
  ];

  await prisma.exploreCategory.deleteMany(); // Clear existing categories
  for (const cat of exploreCategories) {
    await prisma.exploreCategory.create({ data: cat });
  }

  console.log('✅ Successfully seeded 3 Explore Categories!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding banners:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
