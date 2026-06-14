import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ImageBackground,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Polygon, Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import AppIcon from '../../components/ui/AppIcon';
import { useAuth } from '../../context/AuthContext';
import { usersApi, rewardsApi } from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const BROWN = '#6D3914';
const ACCENT = '#8B5E3C';
const BG = '#F5F0EB';

const MIN_POINTS = 0;
const MAX_TIER_POINTS = 2000;

const WAYS_TO_EARN = [
  { id: '1', icon: '🛒', label: 'Per ₹100 spent',   pts: '+10 pts' },
  { id: '2', icon: '🪑', label: 'Per Reservation',  pts: '+50 pts' },
  { id: '3', icon: '⭐', label: 'Write a review',   pts: '+30 pts' },
  { id: '4', icon: '👥', label: 'Refer a friend',   pts: '+100 pts' },
];

// ─── Tier Config ──────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'platinum',
    name: 'CREAM',
    tag: 'BEST VALUE',
    description: 'Unlock all benefits',
    bg: '#E4CDB0',
    text: '#3F1D0E',
    subtext: '#7A5035',
    tagBg: '#3F1D0E',
    divider: 'rgba(63,29,14,0.2)',
    iconBg: 'rgba(63,29,14,0.1)',
    hexFill: '#E4CDB0',
    hexStroke: '#A2663C',
    shadow: '#A2663C',
    benefits: [
      { icon: 'star', label: '5% Extra\npoints' },
      { icon: 'support', label: 'Priority\nsupport' },
      { icon: 'tag', label: 'Exclusive\noffers' },
      { icon: 'time', label: 'Early\naccess' },
      { icon: 'delivery', label: 'Free\ndelivery' },
    ],
  },
  {
    id: 'gold',
    name: 'CARAMEL',
    tag: 'MOST POPULAR',
    description: 'More benefits, more rewards',
    bg: '#A2663C',
    text: '#FFFFFF',
    subtext: '#E4CDB0',
    tagBg: '#3F1D0E',
    divider: 'rgba(228,205,176,0.3)',
    iconBg: 'rgba(255,255,255,0.12)',
    hexFill: '#A2663C',
    hexStroke: '#E4CDB0',
    shadow: '#3F1D0E',
    benefits: [
      { icon: 'star', label: '3% Extra\npoints' },
      { icon: 'support', label: 'Priority\nsupport' },
      { icon: 'tag', label: 'Exclusive\noffers' },
      { icon: 'time', label: 'Early\naccess' },
    ],
  },
  {
    id: 'silver',
    name: 'COFFEE',
    tag: null,
    description: 'Great rewards to get you started',
    bg: '#3F1D0E',
    text: '#E4CDB0',
    subtext: '#A2663C',
    tagBg: '#A2663C',
    divider: 'rgba(228,205,176,0.15)',
    iconBg: 'rgba(228,205,176,0.1)',
    hexFill: '#3F1D0E',
    hexStroke: '#A2663C',
    shadow: '#000000',
    benefits: [
      { icon: 'star', label: '1% Extra\npoints' },
      { icon: 'support', label: 'Standard\nsupport' },
      { icon: 'tag', label: 'Member\noffers' },
      { icon: 'time', label: 'Early\naccess' },
    ],
  },
];

// ─── Benefit Icon ─────────────────────────────────────────────────────────────
const BenefitItem = ({ icon, label, iconBg, textColor }: { icon: string; label: string; iconBg: string; textColor: string }) => (
  <View style={tierStyles.benefitItem}>
    <View style={[tierStyles.benefitIconCircle, { backgroundColor: iconBg }]}>
      <AppIcon name={icon === 'support' ? 'bell' : icon === 'tag' ? 'bookmark' : icon} size={18} color={textColor} />
    </View>
    <Text style={[tierStyles.benefitLabel, { color: textColor }]}>{label}</Text>
  </View>
);

// ─── Hex Icon ─────────────────────────────────────────────────────────────────
const HexIcon = ({ fill, stroke }: { fill: string; stroke: string }) => (
  <Svg width={42} height={46} viewBox="0 0 52 56">
    <Polygon
      points="26,2 50,15 50,41 26,54 2,41 2,15"
      fill={fill}
      stroke={stroke}
      strokeWidth="2"
    />
    <Polygon
      points="26,9 44,19 44,37 26,47 8,37 8,19"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1"
    />
    <Circle cx="26" cy="28" r="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
  </Svg>
);

// ─── Tier Card ────────────────────────────────────────────────────────────────
const TierCardItem = ({ tier, isCurrentTier, onPress }: { tier: typeof TIERS[0]; isCurrentTier: boolean; onPress: () => void }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={[
      tierStyles.card,
      { backgroundColor: tier.bg, shadowColor: tier.shadow },
      isCurrentTier && { borderWidth: 2, borderColor: tier.hexStroke },
    ]}
  >
    <View style={tierStyles.cardInner}>
      {/* Left: Icon + Info */}
      <View style={tierStyles.leftCol}>
        <HexIcon fill={tier.hexFill} stroke={tier.hexStroke} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          {tier.tag && (
            <View style={[tierStyles.tagBadge, { backgroundColor: tier.tagBg }]}>
              <AppIcon name="popular" size={11} color="#FFF" fill="#FFF" />
              <Text style={tierStyles.tagText} numberOfLines={1}>{tier.tag}</Text>
            </View>
          )}
          <Text style={[tierStyles.tierName, { color: tier.text }]}>{tier.name}</Text>
          <Text style={[tierStyles.tierDesc, { color: tier.subtext }]}>{tier.description}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[tierStyles.divider, { backgroundColor: tier.divider }]} />

      {/* Right: Benefits */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tierStyles.benefitsList}
      >
        {tier.benefits.map((b, i) => (
          <BenefitItem key={i} icon={b.icon} label={b.label} iconBg={tier.iconBg} textColor={tier.text} />
        ))}
      </ScrollView>
    </View>
  </TouchableOpacity>
);

const tierStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    minHeight: 90,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 155,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    marginBottom: 4,
    gap: 3,
    flexWrap: 'nowrap',
    flexShrink: 0,
  },
  tagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tierName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  tierDesc: {
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
  },
  divider: {
    width: 1,
    height: 56,
    marginHorizontal: 12,
    borderRadius: 1,
  },
  benefitsList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingRight: 6,
  },
  benefitItem: { alignItems: 'center', minWidth: 50 },
  benefitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  benefitLabel: {
    fontSize: 9,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 12,
  },
});

// ─── Coin Badge ───────────────────────────────────────────────────────────────
const CoinBadge = () => (
  <View style={styles.coinOuter}>
    <View style={styles.coinInner}>
      <Image 
        source={require('../../assets/images/coin_logo.png')} 
        style={styles.coinLogo} 
        resizeMode="contain" 
      />
    </View>
  </View>
);

// ─── Earn Row ─────────────────────────────────────────────────────────────────
const EarnRow = ({ item, isLast }: { item: any, isLast: boolean }) => (
  <TouchableOpacity
    style={[styles.earnRow, !isLast && styles.earnRowBorder]}
    activeOpacity={0.7}
  >
    <View style={styles.earnIconBox}>
      <AppIcon name={item.icon} size={20} color={ACCENT} />
    </View>
    <View style={styles.earnInfo}>
      <Text style={styles.earnLabel}>{item.label}</Text>
      <Text style={styles.earnPts}>{item.pts}</Text>
    </View>
    <AppIcon name="›" size={22} color="#CCCCCC" />
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RewardsScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const points = user?.loyalty_points ?? 0;
  const progress = useMemo(() => {
    const span = Math.max(1, MAX_TIER_POINTS - MIN_POINTS);
    return Math.min(1, Math.max(0, (points - MIN_POINTS) / span));
  }, [points]);
  const ptsToNext = Math.max(0, MAX_TIER_POINTS - points);
  
  const [activity, setActivity] = useState<{ id: string; title: string; subtitle: string; amount: string }[]>([]);
  
  // Checkout & Payment State
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [checkoutAmount, setCheckoutAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI'>('CARD');
  
  // Form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  
  // UI states
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTierName, setSuccessTierName] = useState('');

  const fetchActivity = useCallback(() => {
    usersApi
      .walletTransactions()
      .then((r) => {
        const rows = (r.data?.data || []) as { id: string; description?: string; type?: string; amount?: number; created_at?: string }[];
        setActivity(
          rows.slice(0, 20).map((row) => ({
            id: row.id,
            title: row.description || row.type || 'Activity',
            subtitle: row.created_at ? new Date(row.created_at).toLocaleString() : '',
            amount:
              row.type === 'TOPUP' || row.type === 'REFUND'
                ? `+₹${Math.abs(Number(row.amount) || 0).toFixed(0)}`
                : `-₹${Math.abs(Number(row.amount) || 0).toFixed(0)}`,
          }))
        );
      })
      .catch(() => setActivity([]));
  }, []);

  useEffect(() => {
    refreshUser();
    fetchActivity();
  }, [refreshUser, fetchActivity]);

  const handleTierSelect = useCallback((tier: typeof TIERS[0]) => {
    let minAmt = 99;
    let maxAmt = 149;
    if (tier.id === 'gold') {
      minAmt = 199;
      maxAmt = 299;
    } else if (tier.id === 'platinum') {
      minAmt = 399;
      maxAmt = 499;
    }
    const randAmt = Math.floor(Math.random() * (maxAmt - minAmt + 1)) + minAmt;

    setSelectedTier(tier);
    setCheckoutAmount(randAmt);
    setPaymentMethod('CARD');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardName('');
    setUpiId('');
    setPaymentError('');
  }, []);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/.{1,4}/g);
    if (match) {
      return match.join(' ');
    }
    return cleaned;
  };

  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted.substring(0, 19)); // 16 digits + 3 spaces
  };

  const handleExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setCardExpiry(cleaned);
    }
  };

  const validateForm = (): boolean => {
    if (paymentMethod === 'CARD') {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard.length !== 16 || isNaN(Number(cleanCard))) {
        setPaymentError('Please enter a valid 16-digit card number');
        return false;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setPaymentError('Expiry date must be MM/YY');
        return false;
      }
      const [mm, yy] = cardExpiry.split('/');
      const month = parseInt(mm, 10);
      if (month < 1 || month > 12) {
        setPaymentError('Expiry month must be between 01 and 12');
        return false;
      }
      if (cardCvv.length !== 3 || isNaN(Number(cardCvv))) {
        setPaymentError('CVV must be 3 digits');
        return false;
      }
      if (cardName.trim().length < 3) {
        setPaymentError('Please enter cardholder name');
        return false;
      }
    } else {
      if (!upiId.includes('@') || upiId.trim().length < 3) {
        setPaymentError('Please enter a valid UPI ID (e.g. user@upi)');
        return false;
      }
    }
    setPaymentError('');
    return true;
  };

  const handleCheckoutSubmit = async () => {
    if (!selectedTier) return;
    if (!validateForm()) return;

    setIsPaying(true);
    setPaymentError('');

    try {
      const response = await rewardsApi.purchaseTier({
        tierId: selectedTier.id,
        amount: checkoutAmount,
        paymentMethod: paymentMethod,
      });

      if (response.data?.success) {
        setIsPaying(false);
        const tierName = selectedTier.name;
        setSelectedTier(null);
        setShowSuccess(true);
        setSuccessTierName(tierName);

        refreshUser();
        fetchActivity();
      } else {
        setPaymentError(response.data?.message || 'Payment failed. Please try again.');
        setIsPaying(false);
      }
    } catch (err: any) {
      console.error('Tier purchase error:', err);
      setPaymentError(err.response?.data?.message || err.message || 'Payment processing failed');
      setIsPaying(false);
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Balance Card ── */}
          <View style={styles.balanceCard}>
            {/* Decorative rings */}
            <View style={styles.ringLarge} />
            <View style={styles.ringSmall} />

            <View style={styles.balanceLeft}>
              <Text style={styles.balanceLabel}>Your Balance</Text>
              <Text style={styles.balanceAmount}>{points}</Text>
              <Text style={styles.balanceUnit}>Points</Text>
            </View>

            <CoinBadge />
          </View>

          {/* ── Membership Tiers ── */}
          <Text style={styles.sectionTitle}>Membership Tiers</Text>
          {TIERS.map((tier) => (
            <TierCardItem
              key={tier.id}
              tier={tier}
              isCurrentTier={user?.loyalty_tier?.toLowerCase() === tier.id}
              onPress={() => handleTierSelect(tier)}
            />
          ))}

          {/* ── Ways to Earn ── */}
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <View style={styles.earnCard}>
            {activity.length === 0 ? (
              <Text style={styles.emptyActivity}>No wallet activity yet. Orders and top-ups show here.</Text>
            ) : (
              activity.map((row, index) => (
                <View
                  key={row.id}
                  style={[styles.activityRow, index < activity.length - 1 && styles.earnRowBorder]}
                >
                  <View style={styles.activityText}>
                    <Text style={styles.earnLabel}>{row.title}</Text>
                    <Text style={styles.earnPts}>{row.subtitle}</Text>
                  </View>
                  <Text style={styles.activityAmt}>{row.amount}</Text>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionTitle}>Ways to Earn</Text>

          <View style={styles.earnCard}>
            {WAYS_TO_EARN.map((item, index) => (
              <EarnRow key={item.id} item={item} isLast={index === WAYS_TO_EARN.length - 1} />
            ))}
          </View>

          {/* ── CTA Button ── */}
          <TouchableOpacity 
            style={styles.ctaBtn} 
            activeOpacity={0.85}
            onPress={() => (navigation as any).navigate('AllRewards')}
          >
            <AppIcon name="rewards" size={18} color="#fff" />
            <Text style={styles.ctaText}>View All Rewards</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* ── Checkout Modal ── */}
        <Modal
          visible={selectedTier !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedTier(null)}
        >
          <View style={modalStyles.overlay}>
            <TouchableOpacity 
              style={modalStyles.overlayClose} 
              activeOpacity={1} 
              onPress={() => setSelectedTier(null)} 
            />
            <View style={modalStyles.sheet}>
              {/* Header */}
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>Membership Checkout</Text>
                <TouchableOpacity onPress={() => setSelectedTier(null)} style={modalStyles.closeBtn}>
                  <AppIcon name="close" size={16} color="#6D3914" />
                </TouchableOpacity>
              </View>

              {/* Selected Tier info summary */}
              {selectedTier && (
                <View style={[modalStyles.tierSummary, { backgroundColor: selectedTier.bg }]}>
                  <HexIcon fill={selectedTier.hexFill} stroke={selectedTier.hexStroke} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[modalStyles.summaryName, { color: selectedTier.text }]}>
                      {selectedTier.name} MEMBERSHIP
                    </Text>
                    <Text style={[modalStyles.summaryDesc, { color: selectedTier.subtext }]}>
                      {selectedTier.description}
                    </Text>
                  </View>
                  <View style={modalStyles.badgeContainer}>
                    <Text style={modalStyles.amountLabel}>Price</Text>
                    <Text style={modalStyles.amountText}>₹{checkoutAmount}</Text>
                  </View>
                </View>
              )}

              {/* Selector for card / upi */}
              <Text style={modalStyles.sectionLabel}>Select Payment Method</Text>
              <View style={modalStyles.methodSelector}>
                <TouchableOpacity
                  style={[
                    modalStyles.methodBtn,
                    paymentMethod === 'CARD' && modalStyles.methodBtnActive,
                  ]}
                  onPress={() => {
                    setPaymentMethod('CARD');
                    setPaymentError('');
                  }}
                >
                  <AppIcon name="card" size={18} color={paymentMethod === 'CARD' ? '#FFF' : '#6D3914'} />
                  <Text style={[
                    modalStyles.methodBtnText,
                    paymentMethod === 'CARD' && modalStyles.methodBtnTextActive,
                  ]}>Card</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    modalStyles.methodBtn,
                    paymentMethod === 'UPI' && modalStyles.methodBtnActive,
                  ]}
                  onPress={() => {
                    setPaymentMethod('UPI');
                    setPaymentError('');
                  }}
                >
                  <AppIcon name="zap" size={18} color={paymentMethod === 'UPI' ? '#FFF' : '#6D3914'} />
                  <Text style={[
                    modalStyles.methodBtnText,
                    paymentMethod === 'UPI' && modalStyles.methodBtnTextActive,
                  ]}>UPI ID</Text>
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={modalStyles.formContainer}>
                {paymentMethod === 'CARD' ? (
                  <View style={modalStyles.cardFields}>
                    <View style={modalStyles.inputContainer}>
                      <Text style={modalStyles.inputLabel}>Card Number</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder="XXXX XXXX XXXX XXXX"
                        placeholderTextColor="#A99B90"
                        keyboardType="numeric"
                        value={cardNumber}
                        onChangeText={handleCardNumberChange}
                        maxLength={19}
                      />
                    </View>
                    <View style={modalStyles.rowFields}>
                      <View style={[modalStyles.inputContainer, { flex: 1, marginRight: 12 }]}>
                        <Text style={modalStyles.inputLabel}>Expiry (MM/YY)</Text>
                        <TextInput
                          style={modalStyles.input}
                          placeholder="MM/YY"
                          placeholderTextColor="#A99B90"
                          keyboardType="numeric"
                          value={cardExpiry}
                          onChangeText={handleExpiryChange}
                          maxLength={5}
                        />
                      </View>
                      <View style={[modalStyles.inputContainer, { flex: 1 }]}>
                        <Text style={modalStyles.inputLabel}>CVV</Text>
                        <TextInput
                          style={modalStyles.input}
                          placeholder="123"
                          placeholderTextColor="#A99B90"
                          keyboardType="numeric"
                          secureTextEntry
                          value={cardCvv}
                          onChangeText={(text) => setCardCvv(text.replace(/\D/g, '').substring(0, 3))}
                          maxLength={3}
                        />
                      </View>
                    </View>
                    <View style={modalStyles.inputContainer}>
                      <Text style={modalStyles.inputLabel}>Cardholder Name</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder="e.g. John Doe"
                        placeholderTextColor="#A99B90"
                        value={cardName}
                        onChangeText={setCardName}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={modalStyles.upiFields}>
                    <View style={modalStyles.inputContainer}>
                      <Text style={modalStyles.inputLabel}>UPI ID</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder="username@bank"
                        placeholderTextColor="#A99B90"
                        autoCapitalize="none"
                        value={upiId}
                        onChangeText={(text) => setUpiId(text.trim())}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Error Message */}
              {paymentError ? (
                <Text style={modalStyles.errorText}>{paymentError}</Text>
              ) : null}

              {/* Action Buttons */}
              <TouchableOpacity
                style={modalStyles.payBtn}
                activeOpacity={0.9}
                onPress={handleCheckoutSubmit}
                disabled={isPaying}
              >
                {isPaying ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={modalStyles.payBtnText}>
                    Pay ₹{checkoutAmount}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Success Modal ── */}
        <Modal
          visible={showSuccess}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSuccess(false)}
        >
          <View style={modalStyles.successOverlay}>
            <View style={modalStyles.successCard}>
              <View style={modalStyles.successBadge}>
                <AppIcon name="check" size={36} color="#FFF" />
              </View>
              <Text style={modalStyles.successTitle}>Payment Successful!</Text>
              <Text style={modalStyles.successSubtitle}>
                Welcome to the premium {successTierName} Tier membership group. Your benefits are now active.
              </Text>
              <TouchableOpacity
                style={modalStyles.successBtn}
                activeOpacity={0.9}
                onPress={() => setShowSuccess(false)}
              >
                <Text style={modalStyles.successBtnText}>Great!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  backIcon: { fontSize: 20, color: '#1A1A1A' },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: 13, color: '#888', marginTop: 1 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100, width: '100%' },

  // Balance card
  balanceCard: {
    backgroundColor: BROWN,
    borderRadius: 24,
    padding: 28,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 180,
    overflow: 'hidden',
    position: 'relative',
  },
  ringLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 35,
    borderColor: 'rgba(255,255,255,0.04)',
    right: -60,
    bottom: -60,
  },
  ringSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 25,
    borderColor: 'rgba(255,255,255,0.04)',
    right: 30,
    top: -40,
  },
  balanceLeft: { flex: 1 },
  balanceLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 70,
  },
  balanceUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // Coin
  coinOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#2A1703',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#6B3F1A',
  },
  coinInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#2A1703',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5A3218',
  },
  coinLogo: {
    width: 90,
    height: 90,
  },

  // Tier card
  tierCard: {
    backgroundColor: '#FAF3E8',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tierTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  medalWrap: { alignItems: 'center' },
  medalRibbon: {
    flexDirection: 'row',
    width: 20,
    height: 12,
    marginBottom: -4,
    overflow: 'hidden',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  ribbonStripe: { flex: 1, height: '100%' },
  medal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C0C0C0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A0A0A0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  medalNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#555',
  },
  tierName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  tierNext: { alignItems: 'flex-end' },
  tierNextRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tierNextLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  tierNextPts: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#EDEDED',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BROWN,
    borderRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    color: '#999',
  },

  // Ways to Earn
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  earnCard: {
    backgroundColor: '#FAF3E8',
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  earnRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  earnIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F0EAE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnIcon: { fontSize: 20 },
  earnInfo: { flex: 1 },
  earnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  earnPts: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  chevron: {
    fontSize: 22,
    color: '#CCCCCC',
  },
  emptyActivity: {
    padding: 20,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  activityText: { flex: 1, marginRight: 12 },
  activityAmt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // CTA
  ctaBtn: {
    backgroundColor: BROWN,
    borderRadius: 50,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: BROWN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaIcon: { fontSize: 20 },
  ctaText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(57, 29, 14, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayClose: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FAF3E8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    shadowColor: '#3F1D0E',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3F1D0E',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(109, 57, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  summaryDesc: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  badgeContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  amountLabel: {
    fontSize: 9,
    color: 'rgba(63,29,14,0.6)',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3F1D0E',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D3914',
    marginBottom: 10,
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6D3914',
    backgroundColor: 'transparent',
  },
  methodBtnActive: {
    backgroundColor: '#6D3914',
  },
  methodBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D3914',
  },
  methodBtnTextActive: {
    color: '#FFF',
  },
  formContainer: {
    marginBottom: 20,
  },
  cardFields: {
    gap: 12,
  },
  upiFields: {
    gap: 12,
  },
  inputContainer: {
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D3914',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4CDB0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#3F1D0E',
  },
  rowFields: {
    flexDirection: 'row',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  payBtn: {
    backgroundColor: '#6D3914',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D3914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  payBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(57, 29, 14, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#FAF3E8',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3F1D0E',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6D3914',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successBtn: {
    backgroundColor: '#6D3914',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  successBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
