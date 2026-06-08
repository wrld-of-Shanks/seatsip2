import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  ViewToken,
} from 'react-native';
import { bannersApi } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 190;
const AUTO_SCROLL_MS = 3500;

interface Slide {
  id: string;
  tag: string;
  tagIcon: string;
  tagColor: string;
  tagBg: string;
  title: string;
  subtitle: React.ReactNode;
  ctaText: string;
  ctaBg: string;
  ctaTextColor: string;
  bg: string;
  stripeColor: string;
  subtitleColor: string;
  emoji: string;
  emojiLabel: string;
  emojiLabelColor: string;
  dotColor: string;
  bgImage: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    tag: 'FLASH SALE',
    tagIcon: '⚡',
    tagColor: '#FF6B00',
    tagBg: 'rgba(255,107,0,0.2)',
    title: '60% off\nyour first order',
    subtitle: 'Use code BITE60 at checkout',
    subtitleColor: '#FFBB88',
    ctaText: 'Order now',
    ctaBg: '#FF6B00',
    ctaTextColor: '#fff',
    bg: '#1C0A00',
    stripeColor: 'rgba(255,107,0,0.12)',
    emoji: '🍔',
    emojiLabel: 'BURGERS',
    emojiLabelColor: '#FF6B00',
    dotColor: '#FF6B00',
    bgImage: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: '2',
    tag: 'FREE DELIVERY',
    tagIcon: '🛵',
    tagColor: '#00C98B',
    tagBg: 'rgba(0,229,160,0.15)',
    title: 'No delivery\nfees this week',
    subtitle: 'On orders above ₹299. No code needed.',
    subtitleColor: '#7EC8B0',
    ctaText: 'Browse menu',
    ctaBg: '#00C98B',
    ctaTextColor: '#0A1628',
    bg: '#0A1628',
    stripeColor: 'rgba(0,229,160,0.12)',
    emoji: '🛵',
    emojiLabel: 'EXPRESS',
    emojiLabelColor: '#00C98B',
    dotColor: '#00C98B',
    bgImage: 'https://images.unsplash.com/photo-1526367790999-015078648fc7?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: '3',
    tag: 'BEST VALUE',
    tagIcon: '⭐',
    tagColor: '#A78BFA',
    tagBg: 'rgba(167,139,250,0.18)',
    title: 'Combo meal\nat ₹199 only',
    subtitle: 'Pizza + drink + side. Limited time offer.',
    subtitleColor: '#C4B5FD',
    ctaText: 'Get the combo',
    ctaBg: '#7C3AED',
    ctaTextColor: '#fff',
    bg: '#130D2E',
    stripeColor: 'rgba(167,139,250,0.12)',
    emoji: '🍕',
    emojiLabel: 'COMBO',
    emojiLabelColor: '#A78BFA',
    dotColor: '#7C3AED',
    bgImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: '4',
    tag: 'NEW ARRIVALS',
    tagIcon: '❤️',
    tagColor: '#F472B6',
    tagBg: 'rgba(244,114,182,0.18)',
    title: 'Sweet treats\ndelivered fresh',
    subtitle: 'Cakes, waffles & more. Order before 8 PM.',
    subtitleColor: '#F9A8D4',
    ctaText: 'Explore desserts',
    ctaBg: '#DB2777',
    ctaTextColor: '#fff',
    bg: '#1F0915',
    stripeColor: 'rgba(244,114,182,0.12)',
    emoji: '🍰',
    emojiLabel: 'DESSERTS',
    emojiLabelColor: '#F472B6',
    dotColor: '#DB2777',
    bgImage: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=800&auto=format&fit=crop',
  },
];

const SlideItem = ({ item }: { item: Slide }) => (
  <View style={[styles.slide, { backgroundColor: item.bg, width: SLIDE_WIDTH }]}>
    <Image 
      source={{ uri: item.bgImage }} 
      style={StyleSheet.absoluteFillObject} 
      blurRadius={3}
    />
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
    
    {/* Decorative circle stripe */}
    <View style={[styles.stripe, { backgroundColor: item.stripeColor }]} />

    {/* Left content */}
    <View style={styles.left}>
      {/* Tag pill */}
      <View style={[styles.tagPill, { backgroundColor: item.tagBg }]}>
        <Text style={styles.tagIcon}>{item.tagIcon}</Text>
        <Text style={[styles.tagText, { color: item.tagColor }]}>{item.tag}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{item.title}</Text>

      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: item.subtitleColor }]} numberOfLines={2}>
        {item.subtitle}
      </Text>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.cta, { backgroundColor: item.ctaBg }]}
        activeOpacity={0.82}
      >
        <Text style={[styles.ctaLabel, { color: item.ctaTextColor }]}>{item.ctaText}</Text>
      </TouchableOpacity>
    </View>

    {/* Right emoji illustration */}
    <View style={styles.right}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={[styles.emojiLabel, { color: item.emojiLabelColor }]}>{item.emojiLabel}</Text>
    </View>
  </View>
);

export default function FoodPromoBannerSlider() {
  const listRef = useRef<FlatList>(null);
  const [active, setActive] = useState(0);
  const [slides, setSlides] = useState<Slide[]>(SLIDES);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAuto = () => {
    if (slides.length <= 1) return;
    autoRef.current = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % slides.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_MS);
  };

  const stopAuto = () => {
    if (autoRef.current) clearInterval(autoRef.current);
  };

  useEffect(() => {
    let activeFlag = true;
    async function fetchBanners() {
      try {
        const { data } = await bannersApi.list({ slider_type: 'FOOD_PROMO' });
        if (activeFlag && data?.success && Array.isArray(data.data) && data.data.length > 0) {
          setSlides(data.data);
        }
      } catch (error) {
        console.log('Failed to fetch dynamic food banners:', error);
      }
    }
    fetchBanners();
    return () => {
      activeFlag = false;
    };
  }, []);

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [slides]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActive(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goTo = (i: number) => {
    stopAuto();
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setActive(i);
    startAuto();
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        snapToInterval={SLIDE_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <SlideItem item={item} />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={stopAuto}
        onScrollEndDrag={startAuto}
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({
          length: SLIDE_WIDTH,
          offset: SLIDE_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  listContent: {
    gap: 0,
  },
  slide: {
    height: BANNER_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  stripe: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 260,
    borderRadius: 999,
  },
  left: {
    flex: 1.1,
    paddingVertical: 18,
    paddingLeft: 20,
    paddingRight: 10,
    justifyContent: 'space-between',
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  tagIcon: {
    fontSize: 10,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 27,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  cta: {
    alignSelf: 'flex-start',
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  ctaLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  right: {
    width: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 10,
  },
  emoji: {
    fontSize: 62,
    lineHeight: 74,
  },
  emojiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
});
