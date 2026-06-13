import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  ImageBackground
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { menuApi } from '../../services/api';
import { Svg, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BROWN = '#6B3F1A';
const CREAM = '#FAF6F1';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID = '#555';
const TEXT_LIGHT = '#999';

const AppIcon = ({ name, size = 20, color = '#fff', fill = 'none' }: any) => {
  if (name === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M15 18l-6-6 6-6" />
      </Svg>
    );
  }
  if (name === 'popular') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={2}>
        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </Svg>
    );
  }
  return null;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ExploreItemsRouteProp = RouteProp<RootStackParamList, 'ExploreItems'>;

export default function ExploreItemsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ExploreItemsRouteProp>();
  const { categorySlug, categoryName } = route.params;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await menuApi.list({ exploreCategory: categorySlug });
      setItems(res.data.data || []);
    } catch (err) {
      console.log('Error fetching explore items:', err);
    } finally {
      setLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const renderItem = ({ item }: { item: any }) => {
    // Backend menu items endpoint price is converted to subunits (cents) for Next.js web admin,
    // so we divide by 100 to show the correct value in rupees.
    const priceRupees = (item.price / 100).toFixed(2);
    const cafeId = item.cafe_id || item.cafeId;
    const cafeName = item.cafeName || item.cafe_name || 'Cafe';

    return (
      <View style={styles.itemCard}>
        <Image 
          source={{ uri: item.imageUrl || item.image_url || 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300' }} 
          style={styles.itemImg} 
        />
        <View style={styles.itemInfo}>
          <View style={styles.badge}>
            <AppIcon name="popular" size={10} color={BROWN} fill={BROWN} />
            <Text style={styles.badgeTxt}>{item.category || 'Specialty'}</Text>
          </View>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.cafeName} numberOfLines={1}>at {cafeName}</Text>
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{priceRupees}</Text>
            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => {
                navigation.navigate('Menu', { cafeId, cafeName });
              }}
            >
              <Text style={styles.addBtnTxt}>Order Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/app_bg.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1, width: '100%' }}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <AppIcon name="back" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryName}</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={BROWN} size="large" />
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyTxt}>No items found in this category right now.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  listContent: { padding: 16, paddingBottom: 40 },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FAF3E8',
    borderRadius: 20,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImg: { width: 100, height: 100, borderRadius: 15 },
  itemInfo: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  badgeTxt: { fontSize: 10, color: BROWN, fontWeight: '700', textTransform: 'uppercase' },
  itemName: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  cafeName: { fontSize: 12, color: TEXT_MID, marginBottom: 4 },
  itemDesc: { fontSize: 11, color: TEXT_LIGHT, marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  addBtn: { backgroundColor: BROWN, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  addBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTxt: { fontSize: 14, color: TEXT_MID },
});
