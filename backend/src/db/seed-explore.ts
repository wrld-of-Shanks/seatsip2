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
        is_active: 1,
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
        is_open: 1,
        is_active: 1,
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

  // 4. Create the 4 explore banners from ExploreScreen.tsx
  const exploreBannersData = [
    {
      id: uuidv4(),
      slider_type: 'EXPLORE',
      tag: 'Premium',
      tag_color: '#2D6A4F',
      tag_bg: '#D8F3DC',
      title: 'Matcha Moments',
      subtitle: 'Smooth, earthy matcha creations crafted for a refreshing and calming experience.',
      cta_text: 'Explore',
      cta_bg: '#2D6A4F',
      cta_text_color: '#FFFFFF',
      bg_color: '#1A3326',
      bg_image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?q=80&w=800&auto=format&fit=crop',
      cafe_id: null,
      is_active: 1,
      sort_order: 1,
    },
    {
      id: uuidv4(),
      slider_type: 'EXPLORE',
      tag: 'Sweet',
      tag_color: '#7B4F00',
      tag_bg: '#FFE8A3',
      title: 'Sweet Cravings',
      subtitle: 'Decadent desserts, fluffy waffles, creamy cakes, and treats made to satisfy every craving.',
      cta_text: 'Explore',
      cta_bg: '#FFE8A3',
      cta_text_color: '#7B4F00',
      bg_color: '#33201A',
      bg_image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=800&auto=format&fit=crop',
      cafe_id: null,
      is_active: 1,
      sort_order: 2,
    },
    {
      id: uuidv4(),
      slider_type: 'EXPLORE',
      tag: 'Classic',
      tag_color: '#7A1A00',
      tag_bg: '#FFD6CC',
      title: 'Brew Bar',
      subtitle: 'Freshly brewed coffees, iced blends, and handcrafted café favorites for every mood.',
      cta_text: 'Explore',
      cta_bg: '#FFD6CC',
      cta_text_color: '#7A1A00',
      bg_color: '#2D1A15',
      bg_image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop',
      cafe_id: null,
      is_active: 1,
      sort_order: 3,
    },
    {
      id: uuidv4(),
      slider_type: 'EXPLORE',
      tag: 'Earthy',
      tag_color: '#2D6A4F',
      tag_bg: '#D8F3DC',
      title: 'Matcha Moments',
      subtitle: 'Smooth, earthy matcha creations crafted for a refreshing and calming experience.',
      cta_text: 'Explore',
      cta_bg: '#D8F3DC',
      cta_text_color: '#2D6A4F',
      bg_color: '#1A3326',
      bg_image: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?q=80&w=800&auto=format&fit=crop',
      cafe_id: null,
      is_active: 1,
      sort_order: 4,
    },
  ];

  for (const b of exploreBannersData) {
    await prisma.banner.create({ data: b });
  }

  console.log('✅ Successfully seeded 4 Explore Catalog Banners!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding banners:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
