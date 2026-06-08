import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet, Image, StatusBar, Dimensions, SafeAreaView, Platform, RefreshControl, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator, Alert, ImageBackground, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Svg, Rect, Path, Circle, Line, Polyline } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { cafesApi } from '../../services/api';
import { BRAND } from '../../constants/brand';
import { ADDRESS_STORAGE_KEY } from '../../constants/storageKeys';
import AppIcon from '../../components/ui/AppIcon';
import ProductDetailSheet from '../../components/ui/ProductDetailSheet';
import { useCart } from '../../context/CartContext';
import LoadingScreen from '../auth/LoadingScreen';
import TermsConsentSheet from '../../components/ui/TermsConsentSheet';
import PromoBannerSlider from '../../components/ui/PromoBannerSlider';
import FoodPromoBannerSlider from '../../components/ui/FoodPromoBannerSlider';


type Nav = NativeStackNavigationProp<RootStackParamList>;

const BellIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" />
  </Svg>
);
const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth={2} strokeLinecap="round">
    <Circle cx="11" cy="11" r="8" /><Path d="M21 21l-4.35-4.35" />
  </Svg>
);
const TuneIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round">
    <Line x1="4" y1="6" x2="20" y2="6" /><Line x1="4" y1="12" x2="20" y2="12" /><Line x1="4" y1="18" x2="20" y2="18" />
    <Circle cx="8" cy="6" r="2" fill="#1A1A1A" /><Circle cx="16" cy="12" r="2" fill="#1A1A1A" /><Circle cx="10" cy="18" r="2" fill="#1A1A1A" />
  </Svg>
);
const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill={filled ? '#C8382A' : 'none'} stroke="#C8382A" strokeWidth={2}>
    <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </Svg>
);

const CategoryIcon = ({ label, isActive }: { label: string; isActive: boolean }) => {
  const color = isActive ? '#fff' : '#6B3F1A';
  const size = 26;

  switch (label) {
    case 'Beverages':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M10 2v2M14 2v2M6 2v2"></Path>
          <Path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"></Path>
        </Svg>
      );
    case 'Food':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 8l1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8M5 8h14M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0M12 8l1-6h2"></Path>
        </Svg>
      );
    case 'Dietary':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <Path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </Svg>
      );
    case 'Work':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z" />
          <Path d="M20.054 15.987H3.946" />
        </Svg>
      );
    case 'Social':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
        </Svg>
      );
    case 'Outdoor':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487" />
          <Path d="M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14" />
          <Path d="M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676" />
        </Svg>
      );
    case 'All':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3" y="3" width="7" height="7" rx="1"></Rect>
          <Rect x="14" y="3" width="7" height="7" rx="1"></Rect>
          <Rect x="3" y="14" width="7" height="7" rx="1"></Rect>
          <Rect x="14" y="14" width="7" height="7" rx="1"></Rect>
        </Svg>
      );
    default:
      return null;
  }
};

const CATEGORIES = [
  { label: 'All' },
  { label: 'Beverages' },
  { label: 'Food' },
  { label: 'Dietary' },
  { label: 'Work' },
  { label: 'Social' },
  { label: 'Outdoor' },
];

const QUICK_FILTERS = [
  { id: 'all', label: 'Filters' },
  { id: 'budget', icon: '🛒', label: 'Under ₹150' },
  { id: 'topRated', icon: '⭐', label: 'Top rated' },
  { id: 'offers', icon: '🎁', label: 'Great offers' },
];

// Fallback static data (used when backend is unavailable)
const FALLBACK_CAFES = [
  { id: '1', name: 'Dyu Art Café', tag: 'Art', tags: ['Art'], moods: [] as string[], rating: 4.8, reviews: 521, distance: '2.4 km', eta: '15 min', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400', discount: null as string | null, priceLevel: 2 },
  { id: '2', name: 'Kapi Kafe', tag: 'South-Indian', tags: ['South-Indian'], moods: [] as string[], rating: 4.7, reviews: 631, distance: '2.8 km', eta: '20 min', image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=400', discount: null as string | null, priceLevel: 1 },
];

const CAFE_IMAGES = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=400',
  'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=400',
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
];

const POPULAR_ITEMS = [
  { id: 'c41e866b-a44f-433b-a4a7-6a38daf8a9a1', name: 'Cappuccino', desc: 'A rich shot of espresso with steamed milk & velvety foam.', tags: ['Espresso', 'Velvety', 'with Milk'], cal: '120 cal', price: '₹180', image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300' },
  { id: 'aff18833-3c54-4aff-82a8-dc68593c876e', name: 'Espresso', desc: 'Strong, bold and pure espresso shot for true coffee lovers.', tags: ['Strong', 'Hot', 'Classic'], cal: '60 cal', price: '₹120', image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=300' },
];

// Slides moved to PromoBannerSlider component

type SavedAddress = {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  latitude?: number;
  longitude?: number;
};

type AddressForm = Omit<SavedAddress, 'id'>;

const DEFAULT_ADDRESS: SavedAddress = {
  id: 'default-home',
  label: 'Home',
  addressLine: 'Hubballi',
  city: 'Hubballi',
  state: 'Karnataka',
  pincode: '',
  landmark: '',
};

const EMPTY_ADDRESS_FORM: AddressForm = {
  label: 'Home',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
};

const uniqueParts = (parts: string[]) => {
  const seen = new Set<string>();
  return parts.filter(part => {
    const value = part.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const formatAddressSummary = (address: SavedAddress) => (
  uniqueParts([address.city, address.state]).join(', ') || address.addressLine || 'Add your delivery address'
);

const formatFullAddress = (address: SavedAddress) => {
  const cityState = uniqueParts([address.city, address.state]).join(', ');
  const addressLine = address.addressLine.trim().toLowerCase() === address.city.trim().toLowerCase()
    ? ''
    : address.addressLine;

  return uniqueParts([
    addressLine,
    address.landmark,
    cityState,
    address.pincode,
  ]).join(' • ');
};

const categoryMatches = (categoryLabel: string, tags: string[], moods: string[]) => {
  const label = categoryLabel.toLowerCase().trim();
  if (label === 'all') return true;

  const allWords = [...tags, ...moods].map(x => x.toLowerCase().trim());

  if (label === 'beverages') {
    const drinkKeywords = ['beverage', 'beverages', 'drinks', 'coffee', 'tea', 'café', 'cafe', 'brew', 'espresso'];
    return allWords.some(w => drinkKeywords.some(kw => w.includes(kw)));
  }

  if (label === 'food') {
    const foodKeywords = ['food', 'eat', 'eats', 'bakery', 'croissant', 'sandwich', 'meals', 'pizza', 'burger', 'pasta', 'toast', 'waffle', 'dessert', 'desserts', 'cake'];
    return allWords.some(w => foodKeywords.some(kw => w.includes(kw)));
  }

  if (label === 'dietary') {
    const dietaryKeywords = ['dietary', 'vegan', 'vegetarian', 'veg', 'gluten', 'healthy', 'keto', 'organic'];
    return allWords.some(w => dietaryKeywords.some(kw => w.includes(kw)));
  }

  return allWords.some(w => w.includes(label) || label.includes(w));
};

// Helper to map API cafe to card-friendly shape
function mapCafeToCard(cafe: any, index: number) {
  const tags = Array.isArray(cafe.tags) ? cafe.tags : (typeof cafe.tags === 'string' ? JSON.parse(cafe.tags || '[]') : []);
  const moods = Array.isArray(cafe.moods) ? cafe.moods : (typeof cafe.moods === 'string' ? JSON.parse(cafe.moods || '[]') : []);
  const images = Array.isArray(cafe.images) ? cafe.images : (typeof cafe.images === 'string' ? JSON.parse(cafe.images || '[]') : []);
  return {
    id: cafe.id,
    name: cafe.name,
    tag: tags[0] || 'Café',
    tags,
    moods,
    rating: cafe.rating || 4.5,
    reviews: cafe.review_count || 0,
    distance: cafe.distance || `${(1.5 + index * 0.5).toFixed(1)} km`,
    eta: cafe.prep_time_minutes ? `${cafe.prep_time_minutes} min` : `${15 + index * 5} min`,
    image: images[0] || cafe.image_url || CAFE_IMAGES[index % CAFE_IMAGES.length],
    discount: cafe.discount || null,
    priceLevel: cafe.price_level ?? 2,
  };
}

type CafeCardData = ReturnType<typeof mapCafeToCard>;

const CafeCard = ({ cafe, onPress }: { cafe: CafeCardData; onPress: () => void }) => {
  const [liked, setLiked] = useState(false);
  return (
    <TouchableOpacity activeOpacity={0.93} style={styles.cafeCard} onPress={onPress}>
      <View style={styles.cafeImgWrap}>
        <Image source={{ uri: cafe.image }} style={styles.cafeImg} />
        <TouchableOpacity style={styles.heartBtn} onPress={() => setLiked(!liked)}><HeartIcon filled={liked} /></TouchableOpacity>
        <View style={styles.tagBadge}><Text style={styles.tagText}>{cafe.tag}</Text></View>
      </View>
      <View style={styles.cafeBody}>
        <View style={styles.cafeNameRow}><Text style={styles.cafeName}>{cafe.name}</Text><View style={styles.openBadge}><Text style={styles.openText}>Open</Text></View></View>
        <View style={styles.ratingRow}><AppIcon name="popular" size={13} color="#F4A300" fill="#F4A300" /><Text style={styles.ratingVal}>{cafe.rating}</Text><Text style={styles.ratingCnt}>({cafe.reviews} reviews)</Text></View>
        <View style={styles.divider} />
        <View style={styles.cafeBottom}><View style={styles.ctPill}><Text style={styles.ctPillTxt}>{cafe.tag}</Text></View><View style={styles.etaRow}><AppIcon name="time" size={10} color={TEXT_LIGHT} /><Text style={styles.etaTxt}>{cafe.eta} away</Text></View></View>
      </View>
    </TouchableOpacity>
  );
};

const PopularItem = ({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
  const [liked, setLiked] = useState(false);
  return (
    <View style={styles.popItem}>
      <View style={styles.popImgWrap}><Image source={{ uri: item.image }} style={styles.popImg} /></View>
      <View style={styles.popInfo}>
        <View style={styles.popBadge}><AppIcon name="popular" size={9} color={BROWN} fill={BROWN} /><Text style={styles.popBadgeTxt}>Popular</Text></View>
        <Text style={styles.popName}>{item.name}</Text>
        <Text style={styles.popDesc} numberOfLines={2}>{item.desc}</Text>
        <View style={styles.popTagsRow}>
          {item.tags.map(t => (<View key={t} style={styles.ptag}><Text style={styles.ptagTxt}>{t}</Text></View>))}
          <View style={styles.pcal}><Text style={styles.pcalTxt}>{item.cal}</Text></View>
        </View>
      </View>
      <View style={styles.popRight}>
        <TouchableOpacity onPress={() => setLiked(!liked)} style={styles.popHeart}><HeartIcon filled={liked} /></TouchableOpacity>
        <View>
          <Text style={styles.popPrice}>{item.price}</Text>
          <TouchableOpacity 
            style={styles.addBtn} 
            onPress={() => onPress(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnTxt}>Add +</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

/*
const MarqueeBanner = () => {
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const contentWidth = SCREEN_WIDTH * 2;

  useEffect(() => {
    const startAnimation = () => {
      scrollX.setValue(0);
      Animated.timing(scrollX, {
        toValue: -SCREEN_WIDTH,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => startAnimation());
    };
    startAnimation();
  }, []);

  return (
    <View style={styles.marqueeContainer}>
      <Animated.View style={[styles.marqueeContent, { transform: [{ translateX: scrollX }] }]}>
        <Text style={styles.marqueeText}>
          ☕️ GET 20% OFF ON ALL SPECIALTY BREWS THIS WEEKEND! USE CODE: BREW20 • 🛵 FREE DELIVERY ON ORDERS ABOVE ₹499 • 🌟 JOIN THE SEATSIP CLUB FOR EXCLUSIVE REWARDS • ☕️ GET 20% OFF ON ALL SPECIALTY BREWS...
        </Text>
      </Animated.View>
    </View>
  );
};
*/

export default function CafeSpotHome() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { cart } = useCart();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [activeFilter, setActiveFilter] = useState(QUICK_FILTERS[0].id);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const promoRef = React.useRef<FlatList>(null);
  const infoRef = React.useRef<FlatList>(null);
  const sheetScrollRef = React.useRef<ScrollView>(null);
  const [cafes, setCafes] = useState<CafeCardData[]>(FALLBACK_CAFES);
  const [trending, setTrending] = useState<CafeCardData[]>(FALLBACK_CAFES);
  const [popularItems, setPopularItems] = useState<any[]>(() =>
    POPULAR_ITEMS.map(item => ({
      ...item,
      rawItem: {
        id: item.id,
        name: item.name,
        description: item.desc,
        price: parseInt(item.price.replace('₹', ''), 10),
        image_url: item.image,
        cafe_id: '1',
      }
    }))
  );
  const [refreshing, setRefreshing] = useState(false);
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([DEFAULT_ADDRESS]);
  const [selectedAddressId, setSelectedAddressId] = useState(DEFAULT_ADDRESS.id);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS_FORM);
  const [addressError, setAddressError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  const selectedAddress = addresses.find(address => address.id === selectedAddressId) || addresses[0] || DEFAULT_ADDRESS;

  const persistAddressBook = useCallback(async (nextAddresses: SavedAddress[], nextSelectedAddressId: string) => {
    try {
      await AsyncStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify({
        addresses: nextAddresses,
        selectedAddressId: nextSelectedAddressId,
      }));
    } catch (e) {
      console.log('Unable to save addresses', e);
    }
  }, []);

  const loadCafes = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [nearRes, trendRes, popRes] = await Promise.all([
        cafesApi.list({ limit: 6 }),
        cafesApi.list({ sort: 'trending', limit: 6 }),
        cafesApi.getPopularItems(5).catch(() => ({ data: { success: false, data: [] } })),
      ]);
      const nearCafes = (nearRes.data.data || []).map(mapCafeToCard);
      const trendCafes = (trendRes.data.data || []).map(mapCafeToCard);
      if (nearCafes.length > 0) setCafes(nearCafes);
      if (trendCafes.length > 0) setTrending(trendCafes);

      if (popRes.data.success && Array.isArray(popRes.data.data) && popRes.data.data.length > 0) {
        const mapped = popRes.data.data.map((item: any) => ({
          id: item.id,
          cafe_id: item.cafe_id,
          name: item.name,
          desc: item.description || '',
          image: item.image_url || 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300',
          tags: item.is_veg ? ['Veg'] : ['Non-Veg'],
          cal: item.calories ? `${item.calories} cal` : '120 cal',
          price: `₹${item.price}`,
          rawItem: item,
        }));
        setPopularItems(mapped);
      }
    } catch (err) {
      console.log('Error loading cafes', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCafes();
  }, [loadCafes]);

  /*
  // Auto-slide for Promo Carousel
  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (promoIndex + 1) % PROMO_SLIDES.length;
      setPromoIndex(nextIndex);
      promoRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [promoIndex]);
  */

  /*
  // Auto-slide for Info Carousel
  useEffect(() => {
    const INFO_COUNT = 3;
    const timer = setInterval(() => {
      const nextIndex = (infoIndex + 1) % INFO_COUNT;
      setInfoIndex(nextIndex);
      infoRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [infoIndex]);
  */

  useEffect(() => {
    const loadSavedAddresses = async () => {
      try {
        const stored = await AsyncStorage.getItem(ADDRESS_STORAGE_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.addresses) && parsed.addresses.length > 0) {
          setAddresses(parsed.addresses);
          setSelectedAddressId(parsed.selectedAddressId || parsed.addresses[0].id);
        }
      } catch (e) {
        console.log('Unable to load addresses', e);
      }
    };

    loadSavedAddresses();
  }, []);

  const onRefresh = () => { setRefreshing(true); loadCafes(); };

  const filterCafeList = useCallback((list: CafeCardData[]) => {
    const category = CATEGORIES[activeCategory]?.label || 'All';
    const query = searchQuery.trim().toLowerCase();

    return list
      .filter(cafe => {
        // Search filter matching name, tags, or moods
        const nameMatch = cafe.name.toLowerCase();
        const matchesSearch = !query || nameMatch.includes(query) || 
                              cafe.tags.some(t => t.toLowerCase().includes(query)) ||
                              cafe.moods.some(m => m.toLowerCase().includes(query));

        // Category filter matching tags or moods via semantic helper
        const matchesCategory = categoryMatches(category, cafe.tags, cafe.moods);

        if (!matchesSearch || !matchesCategory) return false;

        // Quick Filters:
        // 'budget' = Under ₹150 (price level <= 1)
        if (activeFilter === 'budget') return cafe.priceLevel <= 1;
        // 'topRated' = Top rated (rating >= 4.5)
        if (activeFilter === 'topRated') return cafe.rating >= 4.5;
        // 'offers' = Great offers (has discount)
        if (activeFilter === 'offers') return !!cafe.discount && cafe.discount.trim() !== '';

        return true;
      })
      .sort((a, b) => {
        if (activeFilter === 'topRated') return b.rating - a.rating;
        if (activeFilter === 'offers') {
          const aHas = !!a.discount && a.discount.trim() !== '';
          const bHas = !!b.discount && b.discount.trim() !== '';
          if (aHas && !bHas) return -1;
          if (!aHas && bHas) return 1;
          return b.reviews - a.reviews;
        }
        return 0;
      });
  }, [activeCategory, activeFilter, searchQuery]);

  const visibleCafes = filterCafeList(cafes);
  const visibleTrending = filterCafeList(trending);
  const cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const latestCartItem = cart?.items?.[cart.items.length - 1];

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressError('');
    setLocationStatus('');
  };

  const updateAddressForm = (field: keyof AddressForm, value: string) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
  };

  const startEditingAddress = (address: SavedAddress) => {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label,
      addressLine: address.addressLine,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark,
      latitude: address.latitude,
      longitude: address.longitude,
    });
    setAddressError('');
    setLocationStatus('');
    // Scroll to the form
    setTimeout(() => {
      sheetScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const selectAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    persistAddressBook(addresses, address.id);
    setAddressSheetVisible(false);
  };

  const saveAddress = () => {
    const cleanedForm: AddressForm = {
      label: addressForm.label.trim() || 'Home',
      addressLine: addressForm.addressLine.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      pincode: addressForm.pincode.trim(),
      landmark: addressForm.landmark.trim(),
      latitude: addressForm.latitude,
      longitude: addressForm.longitude,
    };

    if (!cleanedForm.addressLine || !cleanedForm.city) {
      setAddressError('Please add at least a street/address line and city.');
      return;
    }

    const savedAddress: SavedAddress = editingAddressId
      ? { id: editingAddressId, ...cleanedForm }
      : { id: `address-${Date.now()}`, ...cleanedForm };
    const nextAddresses = editingAddressId
      ? addresses.map(address => address.id === editingAddressId ? savedAddress : address)
      : [savedAddress, ...addresses];

    setAddresses(nextAddresses);
    setSelectedAddressId(savedAddress.id);
    persistAddressBook(nextAddresses, savedAddress.id);
    resetAddressForm();
    setAddressSheetVisible(false);
  };

  const deleteAddress = (addressId: string) => {
    const remaining = addresses.filter(address => address.id !== addressId);
    const nextAddresses = remaining.length > 0 ? remaining : [DEFAULT_ADDRESS];
    const nextSelectedId = selectedAddressId === addressId ? nextAddresses[0].id : selectedAddressId;

    setAddresses(nextAddresses);
    setSelectedAddressId(nextSelectedId);
    persistAddressBook(nextAddresses, nextSelectedId);
    if (editingAddressId === addressId) resetAddressForm();
  };

  const confirmDeleteAddress = (address: SavedAddress) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Remove ${address.label} from your saved addresses?`);
      if (confirmed) deleteAddress(address.id);
      return;
    }

    Alert.alert(
      'Delete address?',
      `Remove ${address.label} from your saved addresses?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteAddress(address.id) },
      ],
    );
  };

  const useCurrentLocation = async () => {
    setLocationLoading(true);
    setAddressError('');
    setLocationStatus('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddressError('Location permission was denied. You can still type the address manually.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const street = uniqueParts([
        place?.name || '',
        uniqueParts([place?.streetNumber || '', place?.street || '']).join(' '),
      ]).join(', ');
      const city = place?.city || place?.district || place?.subregion || '';
      const region = place?.region || '';
      const postalCode = place?.postalCode || '';

      setAddressForm(prev => ({
        ...prev,
        label: prev.label || 'Home',
        addressLine: street || prev.addressLine || `Lat ${position.coords.latitude.toFixed(5)}, Lng ${position.coords.longitude.toFixed(5)}`,
        city: city || prev.city,
        state: region || prev.state,
        pincode: postalCode || prev.pincode,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }));
      setLocationStatus('Current location added. Review it before saving.');
    } catch (e) {
      setAddressError('Could not fetch your location. Please try again or enter the address manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  // if (loading) return <LoadingScreen />;

  return (
    <ImageBackground 
      source={require('../../assets/images/app_bg.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BROWN} />}
        >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setAddressSheetVisible(true)}
            style={styles.locationButton}
          >
            <View style={styles.locRow}><View style={styles.locDot} /><Text style={styles.locLabel}>{selectedAddress.label}</Text><AppIcon name="▾" size={14} color={TEXT_DARK} /></View>
            <Text style={styles.locSub} numberOfLines={1}>{formatAddressSummary(selectedAddress)}</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('NotificationsScreen')}><BellIcon /></TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <View style={styles.searchLeft}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search cafes, moods, vibes..."
              placeholderTextColor={TEXT_LIGHT}
              returnKeyType="search"
            />
          </View>
          {searchQuery.length > 0 ? (
            <TouchableOpacity style={styles.searchIconButton} onPress={() => setSearchQuery('')} activeOpacity={0.75}>
              <AppIcon name="×" size={16} color={TEXT_DARK} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.searchIconButton, showFilters && styles.searchIconButtonActive]}
              onPress={() => setShowFilters(prev => !prev)}
              activeOpacity={0.75}
            >
              <TuneIcon />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        {showFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
            {QUICK_FILTERS.map((f) => {
              const isActive = activeFilter === f.id;

              return (
                <TouchableOpacity key={f.id} style={[styles.fchip, isActive && styles.fchipActive]} onPress={() => setActiveFilter(f.id)}>
                  {f.id === 'all' && (
                    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={isActive ? '#fff' : TEXT_DARK} strokeWidth={2}>
                      <Line x1="4" y1="6" x2="20" y2="6" />
                      <Line x1="8" y1="12" x2="20" y2="12" />
                      <Line x1="12" y1="18" x2="20" y2="18" />
                    </Svg>
                  )}
                  {f.icon && <AppIcon name={f.icon} size={12} color={isActive ? '#fff' : TEXT_DARK} />}
                  <Text style={[styles.fchipTxt, isActive && styles.fchipTxtActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catsScroll} contentContainerStyle={styles.catsContent}>
          {CATEGORIES.map((cat, i) => {
            const isActive = activeCategory === i;
            return (
              <TouchableOpacity 
                key={i} 
                style={styles.catItem} 
                onPress={() => setActiveCategory(i)}
                activeOpacity={0.7}
              >
                <View style={[styles.catCircle, isActive && styles.catCircleActive]}>
                  <CategoryIcon label={cat.label} isActive={isActive} />
                </View>
                <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* <MarqueeBanner /> */}

        {/* New Promo Banner Slider */}
        <PromoBannerSlider />

        {/* Cafes Near You */}
        <View style={styles.secHeader}>
          <View style={styles.secTitle}><View style={styles.secBar} /><Text style={styles.secTitleTxt}>Cafes Near You</Text></View>
          <TouchableOpacity 
            style={styles.seeAllRow} 
            onPress={() => navigation.navigate('CafeList', { title: 'Cafes Near You' })}
          >
            <Text style={styles.seeAll}>See all</Text>
            <AppIcon name="→" size={12} color={BROWN} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cafeRow}>
          {visibleCafes.map(cafe => <CafeCard key={cafe.id} cafe={cafe} onPress={() => navigation.navigate('CafeDetail', { cafeId: cafe.id })} />)}
        </ScrollView>
        {visibleCafes.length === 0 && (
          <Text style={styles.emptySearchText}>No cafes match this search.</Text>
        )}

        {/* Popular Items */}
        <View style={styles.secHeader}>
          <View style={styles.secTitle}><View style={styles.secBar} /><Text style={styles.secTitleTxt}>Popular Items</Text></View>
          <TouchableOpacity 
            style={styles.seeAllRow}
            onPress={() => navigation.navigate('PopularItems')}
          >
            <Text style={styles.seeAll}>See all</Text>
            <AppIcon name="→" size={12} color={BROWN} />
          </TouchableOpacity>
        </View>
        {popularItems.map(item => (
          <PopularItem
            key={item.id}
            item={item}
            onPress={(selectedItem) => {
              setSelectedProduct({
                ...selectedItem.rawItem,
                description: selectedItem.desc,
                image_url: selectedItem.image,
                price: selectedItem.rawItem.price,
                is_popular: true,
              });
            }}
          />
        ))}

        {/* New Food Promo Banner Slider */}
        <FoodPromoBannerSlider />

        {/* Trending Now */}
        <View style={styles.secHeader}>
          <View style={styles.secTitle}><View style={styles.secBar} /><Text style={styles.secTitleTxt}>Trending Now</Text></View>
          <TouchableOpacity 
            style={styles.seeAllRow} 
            onPress={() => navigation.navigate('CafeList', { title: 'Trending Now', filter: 'trending' })}
          >
            <Text style={styles.seeAll}>See all</Text>
            <AppIcon name="→" size={12} color={BROWN} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cafeRow}>
          {visibleTrending.map(cafe => <CafeCard key={cafe.id+'-t'} cafe={cafe} onPress={() => navigation.navigate('CafeDetail', { cafeId: cafe.id })} />)}
        </ScrollView>

        {/* Trust Bar */}
        <View style={styles.trustBar}>
          {[{ icon: '🛵', lbl: 'Fast\nDelivery' },{ icon: '⭐', lbl: 'Top Rated\nCafes' },{ icon: '🎁', lbl: 'Great\nOffers' },{ icon: '🔒', lbl: 'Secure\nPayments' }].map((t, i) => (
            <View key={i} style={styles.trustItem}><AppIcon name={t.icon} size={22} color={BROWN} /><Text style={styles.trustLbl}>{t.lbl}</Text></View>
          ))}
        </View>
        <View style={{ height: cartCount > 0 ? 80 : 20 }} />
      </ScrollView>
      <Modal
        transparent
        visible={addressSheetVisible}
        animationType="slide"
        onRequestClose={() => setAddressSheetVisible(false)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => setAddressSheetVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetKeyboard}
          >
            <View style={styles.addressSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Choose address</Text>
                  <Text style={styles.sheetSub}>Saved places for delivery and pickup</Text>
                </View>
                <TouchableOpacity style={styles.closeSheetBtn} onPress={() => setAddressSheetVisible(false)}>
                  <AppIcon name="×" size={20} color={TEXT_DARK} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                ref={sheetScrollRef}
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.sheetScrollContent}
              >
                <TouchableOpacity
                  style={styles.locationDetectBtn}
                  activeOpacity={0.85}
                  onPress={useCurrentLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={BROWN} />
                  ) : (
                    <Text style={styles.locationDetectIcon}>⌖</Text>
                  )}
                  <View style={styles.locationDetectCopy}>
                    <Text style={styles.locationDetectTitle}>Use current location</Text>
                    <Text style={styles.locationDetectSub}>Allow permission to auto-fill this form</Text>
                  </View>
                </TouchableOpacity>
                {locationStatus ? <Text style={styles.addressSuccess}>{locationStatus}</Text> : null}
                {addressError ? <Text style={styles.addressError}>{addressError}</Text> : null}

                <Text style={styles.addressSectionLabel}>Saved addresses</Text>
                {addresses.map(address => {
                  const isSelected = address.id === selectedAddressId;
                  return (
                    <View key={address.id} style={[styles.savedAddressCard, isSelected && styles.savedAddressCardActive]}>
                      <TouchableOpacity style={styles.savedAddressMain} activeOpacity={0.82} onPress={() => selectAddress(address)}>
                        <View style={[styles.savedAddressDot, isSelected && styles.savedAddressDotActive]} />
                        <View style={styles.savedAddressCopy}>
                          <Text style={styles.savedAddressLabel}>{address.label}</Text>
                          <Text style={styles.savedAddressText} numberOfLines={2}>{formatFullAddress(address)}</Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.addressActions}>
                        <TouchableOpacity style={styles.addressActionBtn} onPress={() => startEditingAddress(address)}>
                          <Text style={styles.addressActionTxt}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addressActionBtn} onPress={() => confirmDeleteAddress(address)}>
                          <Text style={[styles.addressActionTxt, styles.deleteActionTxt]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.formHeader}>
                  <Text style={styles.addressSectionLabel}>{editingAddressId ? 'Edit address' : 'Add new address'}</Text>
                  {editingAddressId ? (
                    <TouchableOpacity onPress={resetAddressForm}>
                      <Text style={styles.cancelEditTxt}>Cancel edit</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TextInput
                  style={styles.addressInput}
                  placeholder="Label, e.g. Home, Work"
                  placeholderTextColor={TEXT_LIGHT}
                  value={addressForm.label}
                  onChangeText={(value) => updateAddressForm('label', value)}
                />
                <TextInput
                  style={[styles.addressInput, styles.addressTextArea]}
                  placeholder="House / building / street"
                  placeholderTextColor={TEXT_LIGHT}
                  value={addressForm.addressLine}
                  onChangeText={(value) => updateAddressForm('addressLine', value)}
                  multiline
                />
                <View style={styles.addressInputRow}>
                  <TextInput
                    style={[styles.addressInput, styles.addressHalfInput]}
                    placeholder="City"
                    placeholderTextColor={TEXT_LIGHT}
                    value={addressForm.city}
                    onChangeText={(value) => updateAddressForm('city', value)}
                  />
                  <TextInput
                    style={[styles.addressInput, styles.addressHalfInput]}
                    placeholder="State"
                    placeholderTextColor={TEXT_LIGHT}
                    value={addressForm.state}
                    onChangeText={(value) => updateAddressForm('state', value)}
                  />
                </View>
                <View style={styles.addressInputRow}>
                  <TextInput
                    style={[styles.addressInput, styles.addressHalfInput]}
                    placeholder="Pincode"
                    placeholderTextColor={TEXT_LIGHT}
                    keyboardType="number-pad"
                    value={addressForm.pincode}
                    onChangeText={(value) => updateAddressForm('pincode', value)}
                  />
                  <TextInput
                    style={[styles.addressInput, styles.addressHalfInput]}
                    placeholder="Landmark"
                    placeholderTextColor={TEXT_LIGHT}
                    value={addressForm.landmark}
                    onChangeText={(value) => updateAddressForm('landmark', value)}
                  />
                </View>
                <TouchableOpacity style={styles.saveAddressBtn} activeOpacity={0.85} onPress={saveAddress}>
                  <Text style={styles.saveAddressTxt}>{editingAddressId ? 'Save changes' : 'Add address'}</Text>
                </TouchableOpacity>
              </ScrollView>
      </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <ProductDetailSheet
        visible={!!selectedProduct}
        item={selectedProduct}
        cafeId={selectedProduct?.cafe_id || cafes[0]?.id || 'dyu-art-cafe'}
        onClose={() => setSelectedProduct(null)}
      />
      {cartCount > 0 && (
        <TouchableOpacity
          style={[styles.floatingCart, { bottom: Math.max(insets.bottom, 16) + 78 }]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Cart')}
        >
          <View style={styles.floatingCartIcon}>
            <AppIcon name="cart" size={18} color="#fff" />
            <View style={styles.floatingCartBadge}>
              <Text style={styles.floatingCartBadgeText}>{cartCount}</Text>
            </View>
          </View>
          <View style={styles.floatingCartCopy}>
            <Text style={styles.floatingCartTitle}>View Cart</Text>
            <Text style={styles.floatingCartMeta} numberOfLines={1}>
              {latestCartItem?.name || `${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
            </Text>
          </View>
          <Text style={styles.floatingCartPrice}>₹{cart?.total?.toFixed(0) || '0'}</Text>
        </TouchableOpacity>
      )}
      <TermsConsentSheet />
      </View>
    </ImageBackground>
  );
}

const BROWN = '#6B3F1A';
const CREAM = '#FAF6F1';
const CARD_BG = '#FAF3E8';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID = '#555';
const TEXT_LIGHT = '#999';
const CARD_W = 240; // Use fixed width for horizontal scrolling cards
const SCREEN_WIDTH_CAPPED = Math.min(Dimensions.get('window').width, 430);
const BANNER_WIDTH = SCREEN_WIDTH_CAPPED - 32;

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, position: 'relative' },
  locationButton: { flex: 1, paddingRight: 8 },
  logoContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  logoImage: { width: 100, height: 35 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BROWN },
  locLabel: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  locChev: { fontSize: 12, color: TEXT_DARK },
  locSub: { fontSize: 10, color: TEXT_MID, marginTop: 1, marginLeft: 11, maxWidth: 120 },
  bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EBE3', justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 14, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 6px rgba(0,0,0,0.05)' } }) },
  searchLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, minHeight: 28, paddingVertical: 0, fontSize: 13, color: TEXT_DARK },
  searchIconButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  searchIconButtonActive: { backgroundColor: '#F0EBE3' },
  searchPh: { fontSize: 13, color: TEXT_LIGHT },
  catsScroll: { marginBottom: 14 },
  catsContent: { paddingHorizontal: 16, gap: 12 },
  catItem: { alignItems: 'center', width: 72 },
  catCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0EBE3', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  catCircleActive: { backgroundColor: BROWN },
  catLabel: { fontSize: 11, color: TEXT_MID, textAlign: 'center', fontWeight: '500' },
  catLabelActive: { color: BROWN, fontWeight: '700' },
  filtersScroll: { marginBottom: 14 },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  fchip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0EBE3', borderWidth: 1, borderColor: '#E0D5C5' },
  fchipActive: { backgroundColor: BROWN, borderColor: BROWN },
  fchipEmoji: { fontSize: 12 },
  fchipTxt: { fontSize: 12, color: TEXT_DARK, fontWeight: '500' },
  fchipTxtActive: { color: '#fff' },
  promoContainer: { borderRadius: 24, overflow: 'hidden', aspectRatio: 2.1, marginBottom: 6, position: 'relative' },
  promoSlide: { height: '100%', aspectRatio: 2.1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', borderRadius: 24 },
  promoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(35,18,5,0.68)', borderRadius: 24 },
  promoLeft: { flex: 1, padding: 16, zIndex: 1 },
  promoTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  promoTagTxt: { fontSize: 8, color: '#C4A882', letterSpacing: 1.5, textTransform: 'uppercase' },
  promoH: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  promoMenu: { fontSize: 13, color: '#C4A882', fontWeight: '600', marginBottom: 3 },
  promoSub: { fontSize: 13, color: '#ddd', lineHeight: 18, marginTop: 4 },
  promoBtn: { marginTop: 10, backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  promoBtnTxt: { fontSize: 11, fontWeight: '700', color: BROWN },
  promoRight: { paddingRight: 18, zIndex: 1, alignItems: 'flex-end' },
  promoBig: { fontSize: 52, fontWeight: '900', color: '#fff', lineHeight: 54 },
  promoOff: { fontSize: 13, fontWeight: '700', color: '#C4A882', textAlign: 'right', letterSpacing: 1 },
  promoDots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 4, zIndex: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff', width: 14 },
  p2Meta: { fontSize: 11, color: '#ddd' },
  p2MetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 18, marginBottom: 10 },
  secTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secBar: { width: 3, height: 18, borderRadius: 2, backgroundColor: BROWN },
  secTitleTxt: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  seeAll: { fontSize: 12, color: BROWN, fontWeight: '600' },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cafeRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  emptySearchText: { marginHorizontal: 16, marginBottom: 4, fontSize: 12, color: TEXT_LIGHT },
  cafeCard: { width: CARD_W, backgroundColor: CARD_BG, borderRadius: 16, overflow: 'hidden', borderWidth: 2.5, borderColor: 'rgba(255, 255, 255, 0.35)', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8 }, android: { elevation: 3 }, web: { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' } }) },
  cafeImgWrap: { width: '100%', height: 120, position: 'relative' },
  cafeImg: { width: '100%', height: '100%' },
  heartBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  distBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  distText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  tagBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: BROWN, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  cafeBody: { padding: 10 },
  cafeNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cafeName: { fontSize: 16, fontFamily: 'Fredoka_400Regular', color: TEXT_DARK, flex: 1 },
  openBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  openText: { fontSize: 10, color: '#2E7D32', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  star: { color: '#F4A300', fontSize: 13 },
  ratingVal: { fontSize: 12, fontWeight: '700', color: TEXT_DARK },
  ratingCnt: { fontSize: 11, color: TEXT_LIGHT },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 12, fontWeight: '700', color: TEXT_DARK },
  statLbl: { fontSize: 9, color: TEXT_LIGHT, marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F0EBE3', marginBottom: 8 },
  cafeBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ctPill: { backgroundColor: '#F0EBE3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  ctPillTxt: { fontSize: 10, color: BROWN, fontWeight: '600' },
  etaTxt: { fontSize: 10, color: TEXT_LIGHT },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  popItem: { flexDirection: 'row', backgroundColor: CARD_BG, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 10, gap: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 6px rgba(0,0,0,0.05)' } }) },
  popImgWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  popImg: { width: '100%', height: '100%' },
  popInfo: { flex: 1 },
  popBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF3E8', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 3 },
  popBadgeTxt: { fontSize: 9, color: BROWN, fontWeight: '700' },
  popName: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  popDesc: { fontSize: 10, color: TEXT_MID, lineHeight: 14, marginBottom: 5 },
  popTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  ptag: { backgroundColor: '#F0EBE3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ptagTxt: { fontSize: 9, color: TEXT_MID },
  pcal: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pcalTxt: { fontSize: 9, color: '#2E7D32' },
  popRight: { justifyContent: 'space-between', alignItems: 'flex-end' },
  popHeart: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center' },
  popPrice: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, textAlign: 'right' },
  addBtn: { backgroundColor: BROWN, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginTop: 4 },
  addBtnTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },
  floatingCart: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: '#2C1A0E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: '#2C1A0E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingCartIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C9922A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  floatingCartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  floatingCartBadgeText: {
    color: '#2C1A0E',
    fontSize: 10,
    fontWeight: '900',
  },
  floatingCartCopy: {
    flex: 1,
  },
  floatingCartTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  floatingCartMeta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  floatingCartPrice: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 10,
  },
  trustBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: CARD_BG, marginHorizontal: 16, borderRadius: 16, padding: 16, marginTop: 18, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 6px rgba(0,0,0,0.04)' } }) },
  trustItem: { alignItems: 'center' },
  trustIcon: { fontSize: 22, marginBottom: 4 },
  trustLbl: { fontSize: 9.5, color: TEXT_MID, textAlign: 'center', lineHeight: 13 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 18, 10, 0.45)' },
  sheetKeyboard: { justifyContent: 'flex-end' },
  addressSheet: {
    maxHeight: '88%',
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#D8CDBF', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  sheetSub: { fontSize: 12, color: TEXT_MID, marginTop: 2 },
  closeSheetBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0EBE3', justifyContent: 'center', alignItems: 'center' },
  closeSheetTxt: { fontSize: 24, lineHeight: 26, color: TEXT_DARK },
  sheetScrollContent: { paddingBottom: 18 },
  locationDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#E2D2BF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  locationDetectIcon: { width: 22, textAlign: 'center', fontSize: 21, color: BROWN, fontWeight: '800' },
  locationDetectCopy: { flex: 1 },
  locationDetectTitle: { fontSize: 14, fontWeight: '800', color: BROWN },
  locationDetectSub: { fontSize: 11, color: TEXT_MID, marginTop: 2 },
  addressSuccess: { fontSize: 12, color: '#2E7D32', marginBottom: 8 },
  addressError: { fontSize: 12, color: '#C8382A', marginBottom: 8 },
  addressSectionLabel: { fontSize: 13, fontWeight: '800', color: TEXT_DARK, marginTop: 10, marginBottom: 8 },
  savedAddressCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DDD0',
    padding: 12,
    marginBottom: 10,
  },
  savedAddressCardActive: { borderColor: BROWN, backgroundColor: '#FFF8EF' },
  savedAddressMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  savedAddressDot: { width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: '#CDBEAE', marginTop: 3 },
  savedAddressDotActive: { borderColor: BROWN, backgroundColor: BROWN },
  savedAddressCopy: { flex: 1 },
  savedAddressLabel: { fontSize: 14, fontWeight: '800', color: TEXT_DARK },
  savedAddressText: { fontSize: 12, color: TEXT_MID, lineHeight: 17, marginTop: 3 },
  addressActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  addressActionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F0EBE3' },
  addressActionTxt: { fontSize: 11, fontWeight: '800', color: BROWN },
  deleteActionTxt: { color: '#C8382A' },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancelEditTxt: { fontSize: 12, fontWeight: '800', color: BROWN, marginTop: 10, marginBottom: 8 },
  addressInput: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#E8DDD0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: TEXT_DARK,
    marginBottom: 10,
  },
  addressTextArea: { minHeight: 74, textAlignVertical: 'top' },
  addressInputRow: { flexDirection: 'row', gap: 10 },
  addressHalfInput: { flex: 1 },
  saveAddressBtn: { backgroundColor: BROWN, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 2 },
  saveAddressTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  marqueeContainer: {
    backgroundColor: BROWN,
    paddingVertical: 6,
    marginBottom: 14,
    overflow: 'hidden',
  },
  marqueeContent: {
    flexDirection: 'row',
    width: '100%',
    flex: 4,
  },
  marqueeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
