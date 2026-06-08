import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from './AppIcon';
import { useCart } from '../../context/CartContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, Spacing } from '../../theme';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

const MILKS = [
  { id: 'whole', label: 'Whole Milk', icon: '🥛' },
  { id: 'oat', label: 'Oat Milk', icon: '🌾' },
  { id: 'almond', label: 'Almond Milk', icon: '🌰' },
  { id: 'soy', label: 'Soy Milk', icon: '🫘' },
];

type ProductDetailSheetProps = {
  visible: boolean;
  item: any | null;
  cafeId: string;
  onClose: () => void;
};

const SteamLine = ({ delay }: { delay: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 0.8, 1], outputRange: [0, 0.6, 0.3, 0] });

  return <Animated.View style={[styles.steamLine, { opacity, transform: [{ translateY }] }]} />;
};

const SingleCup = () => (
  <View style={styles.cupWrap}>
    <View style={styles.cup}>
      <View style={styles.coffee} />
      <View style={styles.cupShine} />
    </View>
    <View style={styles.cupHandle} />
    <View style={styles.saucer} />
  </View>
);

const CupStack = ({ quantity, scale }: { quantity: number; scale: number }) => {
  const cupCount = Math.min(quantity, 3);

  return (
    <View style={styles.cupStage}>
      <View style={styles.steamRow}>
        {[0, 1, 2].map((i) => <SteamLine key={i} delay={i * 180} />)}
      </View>
      <View style={styles.cupsRow}>
        {Array.from({ length: cupCount }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.cupSlot,
              {
                marginLeft: index > 0 ? -18 : 0,
                transform: [{ scale: scale - index * 0.05 }],
                zIndex: index,
              },
            ]}
          >
            <SingleCup />
          </View>
        ))}
        {quantity > 3 && (
          <View style={styles.extraBadge}>
            <Text style={styles.extraBadgeText}>+{quantity - 3}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default function ProductDetailSheet({ visible, item, cafeId, onClose }: ProductDetailSheetProps) {
  const { insets, bottomSheetHeight, responsive, isSmallPhone, isTablet, width } = useResponsive();
  const { addToCart } = useCart();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedMilk, setSelectedMilk] = useState('whole');
  const [adding, setAdding] = useState(false);

  const isBeverage = useMemo(() => {
    if (!item?.category) return true;
    const cat = item.category.toLowerCase();
    return !(
      cat.includes('food') ||
      cat.includes('dessert') ||
      cat.includes('snack') ||
      cat.includes('bakery') ||
      cat.includes('sides') ||
      cat.includes('meal') ||
      cat.includes('combo')
    );
  }, [item?.category]);

  const snapPoints = useMemo(() => ['85%'], []);

  useEffect(() => {
    if (visible && item) {
      const defaultSize = isBeverage ? (item.sizes?.[1] || item.sizes?.[0] || null) : null;
      setSelectedSize(defaultSize);
      setQuantity(1);
      setSelectedMilk('whole');
      setAdding(false);
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible, item, isBeverage]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    []
  );

  if (!item) return null;

  const rawPrice = typeof item.price === 'string'
    ? Number.parseInt(item.price.replace(/[^\d]/g, ''), 10)
    : item.price;
  const basePrice = Number.isFinite(rawPrice) ? rawPrice : 150;
  const currentPrice = Math.max(50, basePrice + (selectedSize?.priceModifier || 0));
  const totalPrice = currentPrice * quantity;
  const totalCaffeine = (item.caffeine || 150) * (selectedSize?.volume / 355 || 1) * quantity;

  const handleAddToCart = async () => {
    try {
      setAdding(true);
      await addToCart(cafeId, item.id, quantity);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  const sheetWidth = isTablet ? (width - Spacing.md * 3) / 2 : width - Spacing.md * 2;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      detached={true}
      bottomInset={Spacing.md}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={[
        styles.sheetBackground,
        { width: sheetWidth, alignSelf: 'center' }
      ]}
      style={{ width: sheetWidth, alignSelf: 'center' }}
    >
      <BottomSheetScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + Spacing.xl }
        ]}
      >
        <View style={styles.hero}>
          {isBeverage ? (
            <>
              {item.image_url && (
                <Image 
                  source={typeof item.image_url === 'string' ? { uri: item.image_url } : item.image_url} 
                  style={[StyleSheet.absoluteFill, { opacity: 0.18 }]} 
                  resizeMode="cover"
                />
              )}
              <CupStack quantity={quantity} scale={selectedSize?.name === 'Large' ? 1 : selectedSize?.name === 'Small' ? 0.72 : 0.88} />
            </>
          ) : item.image_url ? (
            <Image 
              source={typeof item.image_url === 'string' ? { uri: item.image_url } : item.image_url} 
              style={StyleSheet.absoluteFillObject} 
              resizeMode="cover"
            />
          ) : (
            <View style={styles.foodPlaceholder}>
              <Text style={styles.foodPlaceholderEmoji}>
                {item.category?.toLowerCase().includes('dessert') ? '🍰' : '🍔'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.popularPill}>
              <AppIcon name="popular" size={11} color={Colors.brand} fill={Colors.brand} />
              <Text style={styles.popularText}>{item.is_popular ? 'Popular' : 'Recommended'}</Text>
            </View>
            <Text style={[styles.price, { fontSize: responsive(18, 20, 22) }]}>₹{totalPrice}</Text>
          </View>

          <Text style={[styles.name, { fontSize: responsive(20, 24, 28) }]}>{item.name}</Text>
          <Text style={[styles.desc, { fontSize: responsive(11, 12, 13) }]}>
            {item.description || 'Experience the perfect blend of tradition and craftsmanship. Smooth, bold, and endlessly satisfying.'}
          </Text>

          {isBeverage && (
            <View style={styles.caffeinePill}>
              <AppIcon name="zap" size={13} color={Colors.brand} />
              <Text style={styles.caffeineText}>
                <Text style={styles.caffeineStrong}>{totalCaffeine.toFixed(0)} mg</Text> caffeine
              </Text>
            </View>
          )}

          {isBeverage && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Size</Text>
              <View style={styles.sizeRow}>
                {item.sizes?.map((size: any) => {
                  const selected = selectedSize?.name === size.name;

                  return (
                    <TouchableOpacity
                      key={size.name}
                      style={[styles.sizeCard, selected && styles.optionActive]}
                      onPress={() => setSelectedSize(size)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.sizeLabel, selected && styles.optionActiveText]}>{size.name}</Text>
                      <Text style={[styles.sizeMeta, selected && styles.optionActiveSubtext]}>
                        {size.volume} {size.unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity((v) => Math.max(1, v - 1))}>
              <Text style={styles.qtyText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity((v) => Math.min(9, v + 1))}>
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>
          </View>

          {isBeverage && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Milk Type</Text>
              <View style={[styles.milkRow, width < 360 && styles.milkRowWrap]}>
                {MILKS.map((milk) => {
                  const selected = selectedMilk === milk.id;

                  return (
                    <TouchableOpacity
                      key={milk.id}
                      style={[
                        styles.milkCard, 
                        selected && styles.optionActive,
                        width < 360 && styles.milkCardSmall
                      ]}
                      onPress={() => setSelectedMilk(milk.id)}
                      activeOpacity={0.85}
                    >
                      <AppIcon name={milk.icon} size={19} color={selected ? Colors.white : Colors.secondary} />
                      <Text style={[styles.milkLabel, selected && styles.optionActiveText]}>{milk.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.cta, { marginTop: Spacing.lg }]}
            activeOpacity={0.9}
            disabled={adding}
            onPress={handleAddToCart}
          >
            {adding ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <AppIcon name="cart" size={18} color={Colors.white} />
                <Text style={styles.ctaText}>
                  {width < 350 ? `Add — ₹${totalPrice}` : `Add to cart — ₹${totalPrice}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handleIndicator: {
    width: 44,
    height: 5,
    backgroundColor: '#E0D8D0',
  },
  sheetBackground: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    overflow: 'hidden',
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
  },
  hero: {
    height: 120,
    borderRadius: 22,
    backgroundColor: '#EDE8E1',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  cupStage: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 18,
  },
  steamRow: {
    height: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
  },
  steamLine: {
    width: 5,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#B8A492',
  },
  cupsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cupSlot: {
    alignItems: 'center',
  },
  cupWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cup: {
    width: 56,
    height: 54,
    borderWidth: 2.5,
    borderColor: '#3A2A20',
    borderRadius: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: '#F8F1E8',
    overflow: 'hidden',
  },
  coffee: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
    backgroundColor: '#6B3F1A',
  },
  cupShine: {
    position: 'absolute',
    top: 14,
    left: 17,
    width: 10,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '12deg' }],
  },
  cupHandle: {
    position: 'absolute',
    right: 8,
    bottom: 22,
    width: 20,
    height: 24,
    borderWidth: 2.5,
    borderLeftWidth: 0,
    borderColor: '#3A2A20',
    borderRadius: 10,
  },
  saucer: {
    width: 68,
    height: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#B9A38E',
    backgroundColor: '#E0D5C8',
    marginTop: 6,
  },
  extraBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2C1A0E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 22,
  },
  extraBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  content: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.white,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  popularPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F0E6',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  popularText: {
    color: '#8A5A22',
    fontSize: 12,
    fontWeight: '800',
  },
  price: {
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  name: {
    color: Colors.textPrimary,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 5,
  },
  desc: {
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  caffeinePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F0E6',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  caffeineText: {
    color: '#6B5140',
    fontSize: 12,
  },
  caffeineStrong: {
    color: Colors.brand,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE4D8',
    marginVertical: 13,
  },
  sectionLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    flexWrap: 'wrap',
  },
  sizeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D8CDBF',
    backgroundColor: '#FAF7F2',
    paddingVertical: 12,
  },
  optionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionActiveText: {
    color: Colors.white,
  },
  optionActiveSubtext: {
    color: 'rgba(255,255,255,0.75)',
  },
  sizeLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 3,
  },
  sizeMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    height: 48,
  },
  qtyBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  qtyValue: {
    width: 40,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  milkRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    flexWrap: 'wrap',
  },
  milkRowWrap: {
    flexWrap: 'wrap',
  },
  milkCard: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D8CDBF',
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 6,
  },
  milkCardSmall: {
    flex: 0,
    width: '48%',
    minHeight: 60,
  },
  milkLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 13,
  },
  cta: {
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: Colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  ctaText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  foodPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5EE',
  },
  foodPlaceholderEmoji: {
    fontSize: 54,
  },
});
