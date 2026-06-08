import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  ViewToken,
} from 'react-native';
import { bannersApi } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 200;
const AUTO_SCROLL_INTERVAL = 3500;

interface BannerSlide {
  id: string;
  tag: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
  ctaText: string;
  bgColor: string;
  overlayColor: string;
  tagColor: string;
  accentColor: string;
  ctaBg: string;
  ctaText2: string;
  emoji: string;
  emojiLabel: string;
  emojiLabelColor: string;
  badge?: string;
  bgImage: string;
}

const SLIDES: BannerSlide[] = [
  {
    id: '1',
    tag: 'Manual brewing',
    title: 'Open today',
    titleAccent: 'Exclusive menu',
    subtitle: 'Catch you over coffee!',
    ctaText: 'Explore now',
    bgColor: '#3D2010',
    overlayColor: 'rgba(30,14,4,0.52)',
    tagColor: '#D3C4A8',
    accentColor: '#EF9F27',
    ctaBg: '#FFFFFF',
    ctaText2: '#2C1A0E',
    emoji: '☕',
    emojiLabel: 'FRESH BREW',
    emojiLabelColor: '#FFFFFF',
    bgImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: '2',
    tag: "Today's deal",
    title: 'Buy 2 get 1 free',
    subtitle: 'On all cold brews & frappes',
    ctaText: 'Grab the deal',
    bgColor: '#1D3A2A',
    overlayColor: 'rgba(10,30,20,0.55)',
    tagColor: '#9FE1CB',
    accentColor: '#1D9E75',
    ctaBg: '#1D9E75',
    ctaText2: '#FFFFFF',
    emoji: '🧋',
    emojiLabel: 'COLD BREW',
    emojiLabelColor: '#9FE1CB',
    badge: "Today's deal",
    bgImage: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: '3',
    tag: 'New arrival',
    title: 'Lavender latte',
    titleAccent: 'Now available',
    subtitle: 'Floral, creamy, calming.',
    ctaText: 'Try it now',
    bgColor: '#1A1040',
    overlayColor: 'rgba(10,5,40,0.55)',
    tagColor: '#AFA9EC',
    accentColor: '#AFA9EC',
    ctaBg: '#534AB7',
    ctaText2: '#FFFFFF',
    emoji: '🫖',
    emojiLabel: 'LAVENDER',
    emojiLabelColor: '#CECBF6',
    bgImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: '4',
    tag: 'Loyalty reward',
    title: 'Your 5th cup',
    titleAccent: 'is on us!',
    subtitle: 'Earn stamps with every order.',
    ctaText: 'View rewards',
    bgColor: '#3A1808',
    overlayColor: 'rgba(40,10,0,0.5)',
    tagColor: '#FAC775',
    accentColor: '#FAC775',
    ctaBg: '#BA7517',
    ctaText2: '#FFFFFF',
    emoji: '⭐',
    emojiLabel: 'REWARDS',
    emojiLabelColor: '#FAC775',
    bgImage: 'https://images.unsplash.com/photo-1515822338988-152ec198a4af?q=80&w=800&auto=format&fit=crop',
  },
];

const BannerItem = ({ item }: { item: BannerSlide }) => (
  <View style={[styles.slide, { backgroundColor: item.bgColor, width: SCREEN_WIDTH - 32 }]}>
    <Image 
      source={{ uri: item.bgImage }} 
      style={StyleSheet.absoluteFillObject} 
      blurRadius={1}
    />
    <View style={[styles.overlay, { backgroundColor: item.overlayColor }]} />

    <View style={styles.slideContent}>
      {item.badge ? (
        <View style={[styles.badge, { backgroundColor: item.accentColor }]}>
          <Text style={[styles.badgeText, { color: item.ctaText2 }]}>{item.badge}</Text>
        </View>
      ) : (
        <View style={styles.tagRow}>
          <View style={[styles.tagLine, { backgroundColor: item.tagColor }]} />
          <Text style={[styles.tag, { color: item.tagColor }]}>{item.tag.toUpperCase()}</Text>
        </View>
      )}

      <Text style={styles.title}>{item.title}</Text>
      {item.titleAccent ? (
        <Text style={[styles.titleAccent, { color: item.accentColor }]}>{item.titleAccent}</Text>
      ) : null}
      <Text style={[styles.subtitle, { color: item.tagColor }]}>{item.subtitle}</Text>

      <TouchableOpacity
        style={[styles.cta, { backgroundColor: item.ctaBg }]}
        activeOpacity={0.85}
      >
        <Text style={[styles.ctaLabel, { color: item.ctaText2 }]}>{item.ctaText}</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.emojiBox}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={[styles.emojiLabel, { color: item.emojiLabelColor }]}>{item.emojiLabel}</Text>
    </View>
  </View>
);

export default function PromoBannerSlider() {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slides, setSlides] = useState<BannerSlide[]>(SLIDES);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAuto = () => {
    if (slides.length <= 1) return;
    autoRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % slides.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
  };

  const stopAuto = () => {
    if (autoRef.current) clearInterval(autoRef.current);
  };

  useEffect(() => {
    let active = true;
    async function fetchBanners() {
      try {
        const { data } = await bannersApi.list({ slider_type: 'PROMO' });
        if (active && data?.success && Array.isArray(data.data) && data.data.length > 0) {
          setSlides(data.data);
        }
      } catch (error) {
        console.log('Failed to fetch dynamic promo banners:', error);
      }
    }
    fetchBanners();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [slides]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goTo = (index: number) => {
    stopAuto();
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
    startAuto();
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        snapToInterval={SCREEN_WIDTH - 32}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <BannerItem item={item} />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={stopAuto}
        onScrollEndDrag={startAuto}
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH - 32,
          offset: (SCREEN_WIDTH - 32) * index,
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
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  slideContent: {
    flex: 1,
    padding: 20,
    zIndex: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tagLine: {
    width: 14,
    height: 1.5,
  },
  tag: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 2,
  },
  titleAccent: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  cta: {
    alignSelf: 'flex-start',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  ctaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  emojiBox: {
    position: 'absolute',
    right: 18,
    top: '50%',
    transform: [{ translateY: -40 }],
    alignItems: 'center',
    zIndex: 2,
  },
  emoji: {
    fontSize: 58,
  },
  emojiLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingTop: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 28,
    backgroundColor: '#854F0B',
  },
  dotInactive: {
    width: 20,
    backgroundColor: '#B4B2A9',
  },
});
