import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { cafesApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/types';
import AppIcon from '../../components/ui/AppIcon';
import MapCanvas from './MapCanvas';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(292, SCREEN_WIDTH - 48);

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Category = 'all' | 'cafe' | 'restaurant' | 'cloud_kitchen';
type Source = 'seatsip' | 'foodmap';

type City = {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  zoom_level: number;
};

type Restaurant = {
  id: string;
  source: Source;
  name: string;
  description: string;
  cuisine_type: string;
  category: Exclude<Category, 'all'>;
  address: string;
  lat: number;
  lng: number;
  rating: string;
  total_ratings: number;
  price_range: number;
  is_open: boolean;
  image_url?: string;
  tags: string[];
  distance_km?: number;
  cityName?: string;
};

const CITIES: City[] = [
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, zoom_level: 13 },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, zoom_level: 12 },
  { id: 'bagalkot', name: 'Bagalkot', state: 'Karnataka', lat: 16.1817, lng: 75.6958, zoom_level: 13 },
  { id: 'belgavi', name: 'Belgavi', state: 'Karnataka', lat: 15.8497, lng: 74.4977, zoom_level: 13 },
  { id: 'delhi', name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, zoom_level: 12 },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, zoom_level: 13 },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, zoom_level: 13 },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, zoom_level: 13 },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, zoom_level: 13 },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, zoom_level: 13 },
  { id: 'kochi', name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, zoom_level: 13 },
  { id: 'chandigarh', name: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794, zoom_level: 13 },
];

const CATEGORY_OPTIONS: { id: Category; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'food' },
  { id: 'cafe', label: 'Cafes', icon: 'coffee' },
  { id: 'restaurant', label: 'Restaurants', icon: 'food' },
  { id: 'cloud_kitchen', label: 'Cloud Kitchens', icon: 'kitchen' },
];

const CONCEPTS = [
  ['cafe', 'Third Wave Corner', 'Specialty Coffee', 'Single-origin brews, sourdough toast, and quiet work tables.', 2, ['coffee', 'breakfast', 'wifi']],
  ['restaurant', 'Copper Tiffin', 'South Indian', 'Crisp dosas, filter coffee, thalis, and family-style meals.', 2, ['veg', 'family', 'quick']],
  ['restaurant', 'Biryani Circuit', 'Biryani', 'Slow dum biryani with kebabs, salan, and late-night delivery.', 2, ['spicy', 'late night', 'popular']],
  ['cloud_kitchen', 'Box & Bowl Co.', 'Asian Bowls', 'Delivery-first bowls with noodles, rice, sauces, and add-ons.', 1, ['delivery only', 'fast', 'bowls']],
  ['cafe', 'Roast Lane', 'Cafe', 'Espresso, iced drinks, sandwiches, and a rotating dessert counter.', 2, ['desserts', 'coffee', 'casual']],
] as const;

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=900&q=80';
const PIN_COLORS: Record<Exclude<Category, 'all'>, string> = {
  cafe: '#FF7A3D',
  restaurant: '#E63946',
  cloud_kitchen: '#6C63FF',
};

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

function buildFoodMapRestaurants(city: City): Restaurant[] {
  return CONCEPTS.map(([category, name, cuisineType, description, priceRange, tags], index) => {
    const angle = ((index * 60 + CITIES.findIndex((item) => item.id === city.id) * 13) * Math.PI) / 180;
    const radius = 0.012 + (index % 3) * 0.006;
    const lat = Number((city.lat + Math.sin(angle) * radius).toFixed(6));
    const lng = Number((city.lng + Math.cos(angle) * radius).toFixed(6));

    return {
      id: `${city.id}-${index + 1}`,
      source: 'foodmap',
      name: `${name} ${city.name}`,
      description,
      cuisine_type: cuisineType,
      category: category as Exclude<Category, 'all'>,
      address: `${12 + index}, ${city.name} Central, ${city.state}`,
      lat,
      lng,
      rating: (4.1 + (index % 7) / 10).toFixed(1),
      total_ratings: 120 + index * 23,
      price_range: priceRange,
      is_open: index !== 4,
      image_url: '',
      tags: [...tags],
      distance_km: Number(distanceKm(city.lat, city.lng, lat, lng).toFixed(1)),
    };
  });
}

function determineCategory(cafe: any): 'cafe' | 'restaurant' | 'cloud_kitchen' {
  const name = (cafe.name || '').toLowerCase();
  const desc = (cafe.description || '').toLowerCase();

  let tags: string[] = [];
  try {
    tags = Array.isArray(cafe.tags) ? cafe.tags : JSON.parse(cafe.tags || '[]');
  } catch {}

  let moods: string[] = [];
  try {
    moods = Array.isArray(cafe.moods) ? cafe.moods : JSON.parse(cafe.moods || '[]');
  } catch {}

  const combined = [
    name,
    desc,
    ...tags.map(t => String(t).toLowerCase()),
    ...moods.map(m => String(m).toLowerCase())
  ].join(' ');

  if (combined.includes('kitchen') || combined.includes('cloud') || combined.includes('delivery')) {
    return 'cloud_kitchen';
  }

  if (
    combined.includes('restaurant') ||
    combined.includes('tiffin') ||
    combined.includes('biryani') ||
    combined.includes('meals') ||
    combined.includes('dine') ||
    combined.includes('diner') ||
    combined.includes('cuisine') ||
    combined.includes('food') ||
    combined.includes('curry') ||
    combined.includes('dhaba') ||
    combined.includes('bakery') ||
    combined.includes('bites')
  ) {
    return 'restaurant';
  }

  return 'cafe';
}

function cafeToRestaurant(cafe: any, city: City): Restaurant {
  const lat = Number(cafe.latitude || city.lat);
  const lng = Number(cafe.longitude || city.lng);
  let tags: string[] = [];

  try {
    tags = Array.isArray(cafe.tags) ? cafe.tags : JSON.parse(cafe.tags || '[]');
  } catch {
    tags = [];
  }

  const category = determineCategory(cafe);

  return {
    id: cafe.id,
    source: 'seatsip',
    name: cafe.name,
    description: cafe.description || 'Fresh coffee, meals, and table reservations.',
    cuisine_type: category === 'cafe' ? 'Cafe' : category === 'restaurant' ? 'Restaurant' : 'Cloud Kitchen',
    category,
    address: cafe.address,
    lat,
    lng,
    rating: String(cafe.rating || '4.5'),
    total_ratings: Number(cafe.review_count || 0),
    price_range: Number(cafe.price_level || 2),
    is_open: Boolean(cafe.is_open ?? true),
    image_url: cafe.image_url,
    tags,
    distance_km: Number(distanceKm(city.lat, city.lng, lat, lng).toFixed(1)),
    cityName: cafe.city || city.name,
  };
}

function CategoryFilter({ value, onChange }: { value: Category; onChange: (value: Category) => void }) {
  return (
    <View style={styles.categoryBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
        {CATEGORY_OPTIONS.map((option) => {
          const isActive = value === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.84}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => onChange(option.id)}
            >
              <AppIcon name={option.icon} size={15} color={isActive ? '#fff' : '#2A1A0E'} />
              <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CitySelector({
  visible,
  cities,
  currentCity,
  onSelect,
  onClose,
}: {
  visible: boolean;
  cities: City[];
  currentCity: City;
  onSelect: (city: City) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filteredCities = cities.filter((city) =>
    `${city.name} ${city.state}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.citySheet}>
          <View style={styles.citySheetHeader}>
            <Text style={styles.citySheetTitle}>Select city</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <AppIcon name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.citySearch}>
            <AppIcon name="search" size={16} color="#7B6B5A" />
            <TextInput
              style={styles.citySearchInput}
              placeholder="Search city or state"
              placeholderTextColor="#9B8A78"
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {filteredCities.length === 0 && (
            <View style={styles.noCityContainer}>
              <View style={styles.alertIconBg}>
                <AppIcon name="location" size={16} color="#E63946" />
              </View>
              <Text style={styles.noCityText}>Service not in this area yet</Text>
            </View>
          )}

          <FlatList
            data={filteredCities}
            keyExtractor={(city) => city.id}
            contentContainerStyle={styles.cityList}
            renderItem={({ item }) => {
              const selected = item.id === currentCity.id;
              return (
                <TouchableOpacity
                  style={[styles.cityRow, selected && styles.cityRowActive]}
                  onPress={() => {
                    onSelect(item);
                    setQuery('');
                  }}
                >
                  <View style={styles.cityPin}>
                    <AppIcon name="location" size={16} color={selected ? '#E63946' : '#7B6B5A'} />
                  </View>
                  <View style={styles.cityTextGroup}>
                    <Text style={styles.cityName}>{item.name}</Text>
                    <Text style={styles.cityState}>{item.state}</Text>
                  </View>
                  {selected && <AppIcon name="check" size={18} color="#E63946" />}
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RestaurantCard({
  restaurant,
  selected,
  onPress,
  onOrder,
  onDirections,
}: {
  restaurant: Restaurant;
  selected: boolean;
  onPress: () => void;
  onOrder: () => void;
  onDirections: () => void;
}) {
  const image = restaurant.image_url || FALLBACK_IMAGE;
  const price = 'Rs '.repeat(Math.max(1, Math.min(restaurant.price_range, 4))).trim();

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.restaurantCard, selected && styles.restaurantCardSelected]}
      onPress={onPress}
    >
      <Image source={{ uri: image }} style={styles.restaurantImage} resizeMode="cover" />
      <View style={styles.restaurantBody}>
        <View style={styles.restaurantTopRow}>
          <View style={styles.restaurantTitleGroup}>
            <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
            <Text style={styles.restaurantMeta} numberOfLines={1}>{restaurant.cuisine_type} · {price}</Text>
          </View>
          <View style={styles.ratingPill}>
            <AppIcon name="popular" size={12} color="#1F5F2E" fill="#1F5F2E" />
            <Text style={styles.ratingText}>{restaurant.rating}</Text>
          </View>
        </View>

        <Text style={styles.restaurantDesc} numberOfLines={2}>{restaurant.description}</Text>

        <View style={styles.tagRow}>
          {restaurant.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tagPill}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardActionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onDirections}>
            <AppIcon name="location" size={14} color="#2A1A0E" />
            <Text style={styles.secondaryButtonText}>{restaurant.distance_km?.toFixed(1) || '0.0'} km</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={onOrder}>
            <Text style={styles.primaryButtonText}>{restaurant.source === 'seatsip' ? 'Order / Reserve' : 'Explore'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}


export default function MapScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const listRef = useRef<ScrollView>(null);
  const listAnim = useRef(new Animated.Value(0)).current;

  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [hasRealCafes, setHasRealCafes] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadRestaurants() {
      setLoading(true);

      try {
        const params: any = { limit: 30 };
        const searchQuery = query.trim();
        if (searchQuery) {
          params.search = searchQuery;
        } else {
          params.city = selectedCity.name;
        }

        const response = await cafesApi.list(params);
        const cafes = response.data?.data || [];
        const mappedCafes = cafes.map((cafe: any) => {
          const cafeCity = CITIES.find(c => c.name.toLowerCase() === (cafe.city || '').toLowerCase()) || selectedCity;
          return cafeToRestaurant(cafe, cafeCity);
        });

        if (mounted) {
          setRestaurants(mappedCafes);
          setHasRealCafes(searchQuery ? true : mappedCafes.length > 0);
          
          const firstCafe = mappedCafes[0];
          setSelectedId(firstCafe?.id);

          // If a search query is active and we found a match, auto-navigate there immediately!
          if (searchQuery && firstCafe) {
            // Find matched city
            const matchedCity = CITIES.find(c => c.name.toLowerCase() === (firstCafe.cityName || '').toLowerCase());
            if (matchedCity && matchedCity.id !== selectedCity.id) {
              setSelectedCity(matchedCity);
            }
            
            // Fly the map to the cafe's coordinates
            setTimeout(() => {
              mapRef.current?.focusRestaurant?.(firstCafe);
            }, 600);
          }
        }
      } catch (err) {
        console.error('Error fetching cafes:', err);
        if (mounted) {
          setRestaurants([]);
          setHasRealCafes(false);
          setSelectedId(undefined);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      loadRestaurants();
    }, query.trim() ? 400 : 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [selectedCity, query]);

  const visibleRestaurants = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const matchesCategory = category === 'all' || restaurant.category === category;
      const matchesSearch = !trimmedQuery || [
        restaurant.name,
        restaurant.description,
        restaurant.cuisine_type,
        restaurant.address,
        restaurant.category,
        ...restaurant.tags,
      ].some((value) => value.toLowerCase().includes(trimmedQuery));

      return matchesCategory && matchesSearch;
    });
  }, [category, query, restaurants]);

  const selectedRestaurant =
    visibleRestaurants.find((restaurant) => restaurant.id === selectedId) ||
    visibleRestaurants[0];

  useEffect(() => {
    if (!selectedRestaurant && visibleRestaurants[0]) {
      setSelectedId(visibleRestaurants[0].id);
    }
  }, [selectedRestaurant, visibleRestaurants]);

  useEffect(() => {
    Animated.spring(listAnim, {
      toValue: 1,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [listAnim, selectedCity]);

  // Handle incoming cafe selection from CafeDetail
  useEffect(() => {
    const targetId = route.params?.cafeId;
    if (targetId && !loading && restaurants.length > 0) {
      const target = restaurants.find(r => r.id === targetId);
      if (target) {
        // Delay slightly to ensure MapCanvas is ready
        const timer = setTimeout(() => {
          selectRestaurant(target);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [route.params?.cafeId, loading, restaurants]);

  const selectRestaurant = (restaurant: Restaurant) => {
    if (selectedId === restaurant.id) {
      navigation.navigate('CafeDetail', { cafeId: restaurant.id });
      return;
    }

    setSelectedId(restaurant.id);

    // Auto-switch to the cafe's city if it differs from current selectedCity
    if (restaurant.cityName) {
      const matchedCity = CITIES.find(c => c.name.toLowerCase() === restaurant.cityName?.toLowerCase());
      if (matchedCity && matchedCity.id !== selectedCity.id) {
        setSelectedCity(matchedCity);
        setQuery('');
      }
    }

    const index = visibleRestaurants.findIndex((item) => item.id === restaurant.id);
    if (index >= 0) {
      listRef.current?.scrollTo({ x: index * (CARD_WIDTH + 14), animated: true });
    }

    mapRef.current?.focusRestaurant?.(restaurant);
  };

  const openDirections = (restaurant: Restaurant) => {
    const queryText = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${queryText}`);
  };

  const openRestaurant = (restaurant: Restaurant) => {
    if (restaurant.source === 'seatsip') {
      navigation.navigate('CafeDetail', { cafeId: restaurant.id });
      return;
    }

    navigation.navigate('ExploreTab');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <MapCanvas
        ref={mapRef}
        restaurants={visibleRestaurants}
        city={selectedCity}
        selectedId={selectedRestaurant?.id}
        pinColors={PIN_COLORS}
        onSelect={selectRestaurant}
        onGalleryOpen={() => setGalleryOpen(true)}
        onGalleryClose={() => setGalleryOpen(false)}
      />

      <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }, galleryOpen && { display: 'none' }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.cityButton} onPress={() => setShowCityPicker(true)}>
            <AppIcon name="location" size={17} color="#9CA764" />
            <View style={styles.cityButtonTextGroup}>
              <Text style={styles.cityButtonLabel}>FoodMap</Text>
              <Text style={styles.cityButtonTitle} numberOfLines={1}>{selectedCity.name}</Text>
            </View>
            <AppIcon name="chevron_down" size={16} color="#F5EDD6" />
          </TouchableOpacity>

          <View style={styles.searchBox}>
            <AppIcon name="search" size={16} color="#7B6B5A" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search food places"
              placeholderTextColor="#8E7F70"
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>

        <CategoryFilter value={category} onChange={setCategory} />
      </View>

      {loading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color="#E63946" />
          <Text style={styles.loadingText}>Loading map</Text>
        </View>
      )}

      {!loading && !hasRealCafes && (
        <View style={styles.noServiceCard}>
          <View style={styles.noServiceHeader}>
            <View style={styles.alertIconBg}>
              <AppIcon name="location" size={16} color="#E63946" />
            </View>
            <Text style={styles.noServiceTitle}>Service not in this area</Text>
          </View>
          <Text style={styles.noServiceSubtitle}>
            SeatSip is not available in {selectedCity.name} yet. We are expanding rapidly—stay tuned!
          </Text>
          <TouchableOpacity 
            style={styles.changeCityBtn} 
            onPress={() => setShowCityPicker(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.changeCityBtnText}>Select a registered city</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && hasRealCafes && visibleRestaurants.length === 0 && (
        <View style={styles.emptyState}>
          <AppIcon name="search" size={22} color="#7B6B5A" />
          <Text style={styles.emptyText}>No places found</Text>
        </View>
      )}

      {hasRealCafes && visibleRestaurants.length > 0 && (
        <Animated.View
          style={[
            styles.cardStrip,
            {
              paddingBottom: Math.max(insets.bottom, 18),
              transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }) }],
            },
          ]}
        >
          <ScrollView
            ref={listRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 14}
            decelerationRate="fast"
            contentContainerStyle={styles.cardStripContent}
          >
            {visibleRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                selected={selectedRestaurant?.id === restaurant.id}
                onPress={() => selectRestaurant(restaurant)}
                onOrder={() => openRestaurant(restaurant)}
                onDirections={() => openDirections(restaurant)}
              />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <CitySelector
        visible={showCityPicker}
        cities={CITIES}
        currentCity={selectedCity}
        onClose={() => setShowCityPicker(false)}
        onSelect={(city) => {
          setSelectedCity(city);
          setCategory('all');
          setQuery('');
          setShowCityPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#654121',
    paddingBottom: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  cityButton: {
    minWidth: 132,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityButtonTextGroup: {
    flex: 1,
  },
  cityButtonLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cityButtonTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: '#2A1A0E',
    fontSize: 14,
    paddingVertical: 0,
  },
  categoryBar: {
    marginTop: 12,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryChip: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: '#FFF8EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryChipActive: {
    backgroundColor: '#9CA764',
    borderColor: '#9CA764',
  },
  categoryLabel: {
    color: '#2A1A0E',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  loadingPill: {
    position: 'absolute',
    top: 158,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: '#FFF8EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  loadingText: {
    color: '#2A1A0E',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    position: 'absolute',
    top: '48%',
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: '#FFF8EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: {
    color: '#2A1A0E',
    fontSize: 14,
    fontWeight: '700',
  },
  cardStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardStripContent: {
    paddingHorizontal: 18,
    gap: 14,
  },
  restaurantCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFF8EF',
    borderWidth: 0,
    borderColor: 'transparent',
    position: 'absolute',
    bottom: 110,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  restaurantCardSelected: {
    borderColor: '#E63946',
  },
  restaurantImage: {
    height: 108,
    width: '100%',
    backgroundColor: '#E8C99A',
  },
  restaurantBody: {
    padding: 14,
  },
  restaurantTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  restaurantTitleGroup: {
    flex: 1,
  },
  restaurantName: {
    color: '#20130A',
    fontSize: 16,
    fontWeight: '800',
  },
  restaurantMeta: {
    color: '#7B6B5A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  ratingPill: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    backgroundColor: '#DFF2DF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#1F5F2E',
    fontSize: 12,
    fontWeight: '800',
  },
  restaurantDesc: {
    color: '#5D4B3D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 9,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 11,
    minHeight: 24,
  },
  tagPill: {
    borderRadius: 12,
    backgroundColor: '#EFE5DA',
    paddingHorizontal: 9,
    justifyContent: 'center',
  },
  tagText: {
    color: '#6A5745',
    fontSize: 11,
    fontWeight: '700',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 13,
  },
  secondaryButton: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
    backgroundColor: '#EFE5DA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  secondaryButtonText: {
    color: '#2A1A0E',
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A1A0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.46)',
    justifyContent: 'flex-end',
  },
  noServiceCard: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 248, 239, 0.96)',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(101, 65, 33, 0.15)',
    alignItems: 'center',
    zIndex: 30,
  },
  noServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  alertIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(230, 57, 70, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noServiceTitle: {
    color: '#2A1A0E',
    fontSize: 16,
    fontWeight: '800',
  },
  noServiceSubtitle: {
    color: '#5D4B3D',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  changeCityBtn: {
    backgroundColor: '#654121',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  changeCityBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  noCityContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  noCityText: {
    color: '#A8B2C0',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  citySheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#0D1B2A',
    paddingBottom: 18,
  },
  citySheetHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  citySheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  citySearch: {
    height: 46,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 23,
    backgroundColor: '#FFF8EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  citySearchInput: {
    flex: 1,
    color: '#2A1A0E',
    fontSize: 14,
    paddingVertical: 0,
  },
  cityList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cityRow: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cityRowActive: {
    backgroundColor: 'rgba(230, 57, 70, 0.14)',
  },
  cityPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF8EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityTextGroup: {
    flex: 1,
  },
  cityName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cityState: {
    color: '#A8B2C0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
