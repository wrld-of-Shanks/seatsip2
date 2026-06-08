import React, { useState, useEffect } from 'react';
import { bannersApi } from '../../services/api';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ImageBackground
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import AppIcon from '../../components/ui/AppIcon';

const MENU_CARDS = [
  {
    id: '1',
    title: 'Matcha Moments',
    description: 'Smooth, earthy matcha creations crafted for a refreshing and calming experience.',
    time: 'Premium',
    timeColor: '#2D6A4F',
    timeBg: '#D8F3DC',
    image: require('../../assets/images/explore/matcha_1.png'),
  },
  {
    id: '2',
    title: 'Sweet Cravings',
    description: 'Decadent desserts, fluffy waffles, creamy cakes, and treats made to satisfy every craving.',
    time: 'Sweet',
    timeColor: '#7B4F00',
    timeBg: '#FFE8A3',
    image: require('../../assets/images/explore/sweets.png'),
  },
  {
    id: '3',
    title: 'Brew Bar',
    description: 'Freshly brewed coffees, iced blends, and handcrafted café favorites for every mood.',
    time: 'Classic',
    timeColor: '#7A1A00',
    timeBg: '#FFD6CC',
    image: require('../../assets/images/explore/brew.png'),
  },
  {
    id: '4',
    title: 'Matcha Moments',
    description: 'Smooth, earthy matcha creations crafted for a refreshing and calming experience.',
    time: 'Earthy',
    timeColor: '#2D6A4F',
    timeBg: '#D8F3DC',
    image: require('../../assets/images/explore/matcha_2.png'),
  },
];

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Sub-components ───────────────────────────────────────────────────────────

const MenuCard = ({ item, onPress }: { item: any, onPress: () => void }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
    <Image
      source={item.image}
      style={styles.cardImage}
      resizeMode="cover"
    />
    <View style={styles.cardOverlay} />

    <View style={[styles.timeBadge, { backgroundColor: item.timeBg }]}>
      <AppIcon name="popular" size={12} color={item.timeColor} />
      <Text style={[styles.timeText, { color: item.timeColor }]}>{item.time}</Text>
    </View>

    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDesc}>{item.description}</Text>
      <View style={styles.arrowBtn}>
        <AppIcon name="→" size={18} color="#FFFFFF" />
      </View>
    </View>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const [searchText, setSearchText] = useState('');
  const [cards, setCards] = useState<any[]>(MENU_CARDS);

  useEffect(() => {
    let active = true;
    async function loadCards() {
      try {
        const { data } = await bannersApi.list({ slider_type: 'EXPLORE' });
        if (active && data?.success && Array.isArray(data.data) && data.data.length > 0) {
          const mapped = data.data.map((b: any) => ({
            id: b.id,
            title: b.title,
            description: b.subtitle,
            time: b.tag,
            timeColor: b.tagColor || '#2D6A4F',
            timeBg: b.tagBg || '#D8F3DC',
            image: b.bgImage ? { uri: b.bgImage } : require('../../assets/images/explore/matcha_1.png'),
            cafeId: b.cafeId,
          }));
          setCards(mapped);
        }
      } catch (error) {
        console.log('Failed to fetch explore cards:', error);
      }
    }
    loadCards();
    return () => {
      active = false;
    };
  }, []);

  const handleCardPress = (item: any) => {
    if (item.cafeId) {
      navigation.navigate('CafeDetail', { cafeId: item.cafeId });
    } else {
      navigation.navigate('CafeList', { 
        title: item.title,
        filter: item.title.toLowerCase().replace(' ', '_')
      });
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/app_bg.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Search Bar ── */}
          <View style={styles.searchBar}>
            <AppIcon name="search" size={16} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search the full catalog"
              placeholderTextColor="#AAAAAA"
              value={searchText}
              onChangeText={setSearchText}
            />
            <TouchableOpacity>
              <AppIcon name="filter" size={18} color="#555" />
            </TouchableOpacity>
          </View>

          {/* ── Menu Cards ── */}
          <View style={styles.cardList}>
            {cards.map((item) => (
              <MenuCard 
                key={item.id} 
                item={item} 
                onPress={() => handleCardPress(item)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: '#888888',
    marginTop: 2,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 4,
  },
  bellIcon: {
    fontSize: 18,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  filterIcon: {
    fontSize: 18,
    color: '#555',
  },

  // Cards
  cardList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    backgroundColor: '#FAF3E8',
  },
  cardImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  timeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
    gap: 4,
  },
  timeClock: {
    fontSize: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginBottom: 12,
    maxWidth: '60%',
  },
  arrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
