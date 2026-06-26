import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import AppIcon from '../../components/ui/AppIcon';

const { width } = Dimensions.get('window');

type Route = RouteProp<RootStackParamList, 'BookingConfirmed'>;

// Confetti piece component
const ConfettiPiece = ({ style, delay, color }: any) => {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '20deg'],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }, { rotate: rotateInterpolate }],
          backgroundColor: color,
        },
      ]}
    />
  );
};

// Checkmark circle with scale animation
const CheckCircle = () => {
  const scale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        delay: 200,
        useNativeDriver: false,
      }),
      Animated.timing(checkOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.checkCircle, { transform: [{ scale }] }]}>
      <Animated.View style={{ opacity: checkOpacity }}><AppIcon name="check" size={38} color="#fff" /></Animated.View>
    </Animated.View>
  );
};

// Barcode component
const Barcode = () => {
  const bars: any[] = [];
  // Generate a realistic-looking barcode pattern
  const pattern = [3,1,2,1,4,1,2,3,1,2,1,3,2,1,3,1,2,1,4,2,1,2,1,3,2,1,2,3,1,2,1,3,2,1,4,1,2,1,3,2,1,2,1];
  let x = 0;
  pattern.forEach((w, i) => {
    if (i % 2 === 0) {
      bars.push({ x, width: w, isBar: true });
    } else {
      bars.push({ x, width: w, isBar: false });
    }
    x += w;
  });

  return (
    <View style={styles.barcodeContainer}>
      <View style={styles.barcodeWrapper}>
        {bars.map((bar, index) =>
          bar.isBar ? (
            <View
              key={index}
              style={[
                styles.barcodeBar,
                {
                  width: bar.width * 2,
                  marginHorizontal: 0.5,
                },
              ]}
            />
          ) : (
            <View
              key={index}
              style={{ width: bar.width * 2, marginHorizontal: 0.5 }}
            />
          )
        )}
      </View>
      <Text style={styles.barcodeNumber}>2   8937261   273610</Text>
    </View>
  );
};

export default function BookingConfirmedScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { reservation } = route.params;

  const code = reservation?.confirmation_code || 'SSTYE4VZ';
  const cafeName = reservation?.cafe_name || 'Dyu Art Café';
  const date = reservation?.date || '30 Apr 2026';
  const time = reservation?.time || '19:00';
  const partySize = reservation?.party_size || 2;

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: false,
      }),
      Animated.spring(contentTranslate, {
        toValue: 0,
        friction: 8,
        tension: 50,
        delay: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const confettiPieces = [
    { top: 60, left: 60, width: 10, height: 14, color: '#F4A020', delay: 100 },
    { top: 80, left: 100, width: 8, height: 8, color: '#E05A3A', delay: 150 },
    { top: 50, left: 160, width: 12, height: 8, color: '#4CAF82', delay: 80 },
    { top: 70, right: 80, width: 10, height: 14, color: '#7C6FE0', delay: 120 },
    { top: 55, right: 120, width: 8, height: 10, color: '#E91E8C', delay: 200 },
    { top: 90, right: 60, width: 10, height: 8, color: '#2196F3', delay: 90 },
    { top: 115, left: 55, width: 8, height: 12, color: '#FF9800', delay: 160 },
    { top: 125, right: 55, width: 10, height: 8, color: '#4CAF82', delay: 140 },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0EBE3" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'android' && { paddingTop: (StatusBar.currentHeight || 24) + 16 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main card */}
        <View style={styles.card}>
          {/* Confetti */}
          <View style={[styles.confettiContainer, { pointerEvents: 'none' }]}>
            {confettiPieces.map((piece, index) => (
              <ConfettiPiece
                key={index}
                delay={piece.delay}
                color={piece.color}
                style={[
                  styles.confettiPiece,
                  {
                    top: piece.top,
                    left: piece.left,
                    right: piece.right,
                    width: piece.width,
                    height: piece.height,
                    borderRadius: 2,
                  },
                ]}
              />
            ))}
          </View>

          {/* Check circle */}
          <View style={styles.checkSection}>
            <CheckCircle />
          </View>

          {/* Title */}
          <Animated.View
            style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }}
          >
            <Text style={styles.title}>Table Reserved!</Text>
            <Text style={styles.subtitle}>
              Your booking is confirmed.{'\n'}We'll see you there!
            </Text>
          </Animated.View>

          {/* Dashed divider */}
          <View style={styles.dashedDividerContainer}>
            <View style={styles.semiCircleLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.semiCircleRight} />
          </View>

          {/* Booking details grid */}
          <Animated.View
            style={[
              styles.detailsGrid,
              { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
            ]}
          >
            {/* Row 1 */}
            <View style={styles.detailsRow}>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>BOOKING ID</Text>
                <Text style={styles.detailValueBold}>{code}</Text>
              </View>
              <View style={[styles.detailCell, styles.detailCellRight]}>
                <Text style={styles.detailLabel}>PARTY SIZE</Text>
                <View style={styles.partySizeRow}>
                  <AppIcon name="users" size={14} color="#8B5E3C" />
                  <Text style={styles.partySizeText}>{partySize} people</Text>
                </View>
              </View>
            </View>

            <View style={styles.gridDivider} />

            {/* Row 2 */}
            <View style={styles.detailsRow}>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>VENUE</Text>
                <View style={styles.venueRow}>
                  <View style={styles.venueImagePlaceholder}>
                    <AppIcon name="food" size={20} color="#8B5E3C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.venueName} numberOfLines={2}>{cafeName}</Text>
                    <Text style={styles.venueAddress} numberOfLines={1}>Koramangala, Bengaluru</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.detailCell, styles.detailCellRight]}>
                <Text style={styles.detailLabel}>DATE & TIME</Text>
                <View style={styles.dateRow}>
                  <AppIcon name="calendar" size={14} color="#8B5E3C" />
                  <View>
                    <Text style={styles.dateText}>{date}</Text>
                    <Text style={styles.timeText}>{time}</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Skip the wait banner */}
        <Animated.View
          style={[
            styles.skipBanner,
            { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
          ]}
        >
          <TouchableOpacity 
            style={styles.skipBannerTouchable}
            onPress={() => navigation.navigate('Menu', { cafeId: reservation?.cafe_id, cafeName })}
          >
            <View style={styles.skipIconContainer}>
              <AppIcon name="food" size={20} color="#8B5E3C" />
            </View>
            <View style={styles.skipTextContainer}>
              <Text style={styles.skipTitle}>Skip the wait!</Text>
              <Text style={styles.skipSubtitle}>Pre-order your food & drinks now.</Text>
            </View>
            <AppIcon name="›" size={22} color="#8B5E3C" />
          </TouchableOpacity>
        </Animated.View>

        {/* Barcode card */}
        <Animated.View
          style={[
            styles.barcodeCard,
            { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
          ]}
        >
          <Barcode />
        </Animated.View>
        
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.preorderButton} 
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Menu', { cafeId: reservation?.cafe_id, cafeName })}
        >
          <AppIcon name="preorder" size={18} color="#fff" />
          <Text style={styles.preorderText}>Pre-order Menu</Text>
          <AppIcon name="›" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navButton} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ReservationHistory' as any)}
          >
            <AppIcon name="bookmark" size={20} color="#6B5744" />
            <Text style={styles.navText}>My Bookings</Text>
          </TouchableOpacity>
          <View style={styles.navDivider} />
          <TouchableOpacity 
            style={styles.navButton} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <AppIcon name="home" size={20} color="#6B5744" />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0EBE3',
  },
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  // Main card
  card: {
    backgroundColor: '#FAFAF7',
    borderRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },

  // Confetti
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 1,
  },
  confettiPiece: {
    position: 'absolute',
  },

  // Check circle
  checkSection: {
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 2,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7BA05B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7BA05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  checkMark: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '700',
    marginTop: -2,
  },

  // Title
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1209',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#5C5040',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontWeight: '500',
  },

  // Dashed divider
  dashedDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  semiCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0EBE3',
    marginLeft: -10,
  },
  semiCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0EBE3',
    marginRight: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1.5,
    borderWidth: 1,
    borderColor: '#D5CEC4',
    borderStyle: 'dashed',
  },

  // Details grid
  detailsGrid: {
    paddingHorizontal: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
  },
  detailCell: {
    flex: 1,
  },
  detailCellRight: {
    paddingLeft: 20,
    borderLeftWidth: 1,
    borderLeftColor: '#E8E2D9',
  },
  gridDivider: {
    height: 1,
    backgroundColor: '#E8E2D9',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9C8E7E',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  detailValueBold: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A1209',
    letterSpacing: 1,
  },

  // Party size
  partySizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partySizeIcon: {
    fontSize: 18,
  },
  partySizeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5B8A4A',
  },

  // Venue
  venueRow: {
    marginTop: 4,
  },
  venueName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1209',
    flexShrink: 1,
  },
  venueAddress: {
    fontSize: 12,
    color: '#8C7E6E',
    marginTop: 2,
    fontWeight: '500',
  },

  // Date
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  dateIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5B8A4A',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5B8A4A',
  },

  // Skip banner
  skipBanner: {
    backgroundColor: '#FDF3E3',
    borderRadius: 20,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  skipBannerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  skipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0D9B0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  skipIcon: {
    fontSize: 22,
  },
  skipTextContainer: {
    flex: 1,
  },
  skipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3D2B0E',
  },
  skipSubtitle: {
    fontSize: 13,
    color: '#7A6040',
    marginTop: 2,
    fontWeight: '500',
  },
  skipArrow: {
    fontSize: 28,
    color: '#8C7040',
    fontWeight: '300',
  },

  // Barcode
  barcodeCard: {
    backgroundColor: '#FAFAF7',
    borderRadius: 20,
    marginTop: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  barcodeContainer: {
    alignItems: 'center',
  },
  barcodeWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
  },
  barcodeBar: {
    height: 70,
    backgroundColor: '#1A1209',
  },
  barcodeNumber: {
    fontSize: 13,
    letterSpacing: 6,
    color: '#3A3028',
    marginTop: 12,
    fontWeight: '600',
  },

  // Bottom
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F0EBE3',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingTop: 12,
    gap: 12,
  },
  preorderButton: {
    backgroundColor: '#C0392B',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C0392B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  preorderIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  preorderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  preorderArrow: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FAFAF7',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  navDivider: {
    width: 1,
    backgroundColor: '#E8E2D9',
    marginVertical: 14,
  },
  navIcon: {
    fontSize: 18,
  },
  navText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3A3028',
  },
});
