import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ImageBackground,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppIcon from '../../components/ui/AppIcon';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/api';

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const cleanPhone = (phone?: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return '+' + digits;
  }
  if (digits.length === 10) {
    return '+91' + digits;
  }
  return phone;
};



// ─── Constants ────────────────────────────────────────────────────────────────
const BROWN = '#2C1A0E';
const ACCENT = '#8B5E3C';
const GOLD = '#C9A84C';
const TOPUP_PRESETS = [100, 200, 500, 1000];
const { width: SCREEN_W } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTxDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

function mapWalletTx(row: {
  id: string;
  type?: string;
  amount?: number;
  description?: string;
  created_at?: string;
}) {
  const credit = row.type === 'TOPUP' || row.type === 'REFUND';
  const amt = Number(row.amount) || 0;
  return {
    id: row.id,
    title: row.description || row.type || 'Transaction',
    date: formatTxDate(row.created_at),
    amount: `${credit ? '+' : '-'}₹${Math.abs(amt).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    positive: credit,
    icon: credit ? 'wallet' : 'receipt',
    iconBg: credit ? '#E8F5E9' : '#FFEBEE',
    iconColor: credit ? '#2E7D32' : '#C62828',
  };
}

// ─── TransactionRow ───────────────────────────────────────────────────────────
const TransactionRow = ({ item }: { item: ReturnType<typeof mapWalletTx> }) => (
  <View style={styles.txRow}>
    <View style={[styles.txIconBox, { backgroundColor: item.iconBg }]}>
      <AppIcon name={item.icon} size={16} color={item.iconColor} />
    </View>
    <View style={styles.txInfo}>
      <Text style={styles.txTitle}>{item.title}</Text>
      <Text style={styles.txDate}>{item.date}</Text>
    </View>
    <Text style={[styles.txAmount, { color: item.positive ? '#2E7D32' : '#C62828' }]}>
      {item.amount}
    </Text>
  </View>
);

// ─── AddMoneySheet ────────────────────────────────────────────────────────────
const AddMoneySheet = ({
  visible,
  onClose,
  onTopup,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onTopup: (amount: number) => void;
  loading: boolean;
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');

  const handleConfirm = () => {
    const amt = custom.trim() ? parseInt(custom, 10) : selected;
    if (!amt || amt < 1) {
      Alert.alert('Invalid amount', 'Please enter or select an amount.');
      return;
    }
    if (amt > 50000) {
      Alert.alert('Too high', 'Maximum single top-up is ₹50,000.');
      return;
    }
    onTopup(amt);
  };

  const handleClose = () => {
    setSelected(null);
    setCustom('');
    onClose();
  };

  const displayAmt = custom.trim() ? custom : selected ? String(selected) : '';

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetBackdrop}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>Add Money</Text>
          <Text style={styles.sheetSub}>Funds are added instantly via Razorpay</Text>

          {/* Preset amounts — 2 per row */}
          <View style={styles.presetGrid}>
            {TOPUP_PRESETS.map((amt) => {
              const active = selected === amt && !custom;
              return (
                <TouchableOpacity
                  key={amt}
                  style={[styles.presetBtn, active && styles.presetBtnActive]}
                  onPress={() => { setSelected(amt); setCustom(''); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetTxt, active && styles.presetTxtActive]}>₹{amt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom amount input */}
          <View style={styles.customInputWrapper}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Custom amount"
              placeholderTextColor="#AAA"
              keyboardType="number-pad"
              value={custom}
              onChangeText={(v) => { setCustom(v.replace(/[^0-9]/g, '')); setSelected(null); }}
              maxLength={6}
            />
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnTxt}>
                {displayAmt ? `Proceed to Pay ₹${displayAmt}` : 'Select an amount'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.secureNote}>🔒 Secured by Razorpay</Text>
          <View style={{ height: Platform.OS === 'ios' ? 20 : 28 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PaymentsWalletScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<ReturnType<typeof mapWalletTx>[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const { data } = await usersApi.walletTransactions();
      const rows = (data?.data || []) as Array<{
        id: string;
        type?: string;
        amount?: number;
        description?: string;
        created_at?: string;
      }>;
      setTransactions(rows.map(mapWalletTx));
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshUser();
    loadTransactions();
  }, [loadTransactions, refreshUser]);

  const runWalletTopup = useCallback(
    async (amount: number) => {
      try {
        setTopupLoading(true);

        const { data } = await usersApi.createWalletTopupOrder(amount);
        const d = data?.data as { orderId?: string; keyId?: string; amount?: number; currency?: string } | undefined;

        if (!d?.orderId || !d?.keyId) {
          Alert.alert('Top-up failed', 'Could not create payment order. Try again later.');
          return;
        }

        let checkout: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string } | null = null;
        if (Platform.OS === 'web') {
          const loaded = await loadRazorpayScript();
          if (!loaded) {
            throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
          }
          checkout = await new Promise((resolve, reject) => {
            const options = {
              key: d.keyId,
              amount: d.amount,
              currency: d.currency || 'INR',
              name: 'SeatSip',
              description: 'Wallet top-up',
              order_id: d.orderId,
              prefill: { name: user?.name, email: user?.email, contact: cleanPhone(user?.phone) },
              theme: { color: ACCENT },
              handler: (response: any) => {
                resolve({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
              },
              modal: {
                ondismiss: () => {
                  reject(new Error('Payment cancelled by user'));
                },
              },
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', (response: any) => {
              reject(new Error(response.error.description || 'Payment failed'));
            });
            rzp.open();
          });
        } else {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const RazorpayCheckout = require('react-native-razorpay').default;
            checkout = await RazorpayCheckout.open({
              key: d.keyId,
              amount: d.amount,
              currency: d.currency || 'INR',
              name: 'SeatSip',
              description: 'Wallet top-up',
              order_id: d.orderId,
              prefill: { name: user?.name, email: user?.email, contact: cleanPhone(user?.phone) },
              theme: { color: ACCENT },
            });
          } catch (razorErr: any) {
            if (razorErr?.code === 2 || /cancel/i.test(String(razorErr?.description || ''))) return;
            if (__DEV__) {
              Alert.alert(
                'Dev Mode',
                'Razorpay native module is not linked (Expo Go). Simulate a successful payment?',
                [
                  {
                    text: 'Simulate',
                    onPress: async () => {
                      try {
                        await usersApi.verifyWalletTopup({
                          razorpay_order_id: d.orderId!,
                          razorpay_payment_id: `dev_pay_${Date.now()}`,
                          razorpay_signature: 'dev_bypass',
                        });
                      } catch { /* signature check will fail in dev */ }
                      await refreshUser();
                      await loadTransactions();
                      setSheetVisible(false);
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ],
              );
            } else {
              Alert.alert('Payment unavailable', 'Please update the app to enable payments.');
            }
            return;
          }
        }

        if (!checkout) return;

        await usersApi.verifyWalletTopup({
          razorpay_order_id: checkout.razorpay_order_id,
          razorpay_payment_id: checkout.razorpay_payment_id,
          razorpay_signature: checkout.razorpay_signature,
        });

        await refreshUser();
        await loadTransactions();
        setSheetVisible(false);
        Alert.alert('Success!', `₹${amount} has been added to your wallet.`);
      } catch (e: any) {
        const msg = String(e?.description || e?.response?.data?.message || e?.message || '');
        if (/cancel/i.test(msg) || e?.code === 2) return;
        Alert.alert('Top-up failed', msg || 'Payment could not complete. Please try again.');
      } finally {
        setTopupLoading(false);
      }
    },
    [loadTransactions, refreshUser, user?.email, user?.name, user?.phone],
  );

  const walletDisplay = (Number(user?.wallet_balance) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const pointsDisplay = user?.loyalty_points ?? 0;

  return (
    <ImageBackground
      source={require('../../assets/images/app_bg.png')}
      style={styles.root}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.75} onPress={() => (navigation as any).goBack()}>
            <AppIcon name="back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Payments & Wallet</Text>
            <Text style={styles.headerSub}>Manage your money and payments</Text>
          </View>
        </View>

        {/* ── Content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        >
          {/* Wallet Card */}
          <View style={styles.walletCard}>
            <View style={styles.waveOverlay} />
            <View style={styles.walletLeft}>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletAmount}>₹{walletDisplay}</Text>
              <View style={styles.pointsBadge}>
                <AppIcon name="points" size={12} color={GOLD} fill={GOLD} />
                <Text style={styles.pointsText}>{pointsDisplay} Points available</Text>
              </View>
              <TouchableOpacity
                style={[styles.addMoneyBtn, topupLoading && styles.addMoneyBtnDisabled]}
                activeOpacity={0.85}
                onPress={() => setSheetVisible(true)}
                disabled={topupLoading}
              >
                <Text style={styles.addMoneyText}>
                  {topupLoading ? 'Please wait…' : '+ Add Money'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.walletIllustration}>
              <AppIcon name="wallet" size={46} color="#fff" />
            </View>
          </View>

          {/* How you pay */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How you pay</Text>
            <Text style={styles.cardBody}>
              Checkout and wallet top-ups use Razorpay — supporting UPI, cards, and netbanking. We never store your card number.
            </Text>
          </View>

          {/* Recent Transactions */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Transactions</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <View style={styles.viewAllRow}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <AppIcon name="›" size={16} color={ACCENT} />
                </View>
              </TouchableOpacity>
            </View>

            {txLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={ACCENT} />
            ) : transactions.length === 0 ? (
              <View style={styles.txEmptyBox}>
                <AppIcon name="wallet" size={32} color="#DDD" />
                <Text style={styles.txEmpty}>No transactions yet</Text>
                <Text style={styles.txEmptySub}>Top up your wallet to get started</Text>
              </View>
            ) : (
              transactions.map(item => <TransactionRow key={item.id} item={item} />)
            )}
          </View>

          {/* Secure banner */}
          <View style={styles.secureBanner}>
            <View style={styles.shieldBox}>
              <AppIcon name="privacy" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.secureTitle}>100% Secure Payments</Text>
              <Text style={styles.secureSub}>Your payment details are safe with us.</Text>
            </View>
            <AppIcon name="›" size={20} color="#C0C0C0" />
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Add Money Bottom Sheet */}
      <AddMoneySheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onTopup={runWalletTopup}
        loading={topupLoading}
      />
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, width: '100%' },
  safeArea: { flex: 1, width: '100%' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 14,
    width: '100%',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: '#666', marginTop: 1 },

  scroll: { flex: 1, width: '100%' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    width: '100%',
  },

  // Wallet Card
  walletCard: {
    backgroundColor: BROWN,
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
    minHeight: 180,
    position: 'relative',
  },
  waveOverlay: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 36,
    borderColor: 'rgba(255,255,255,0.05)',
    right: -60,
    bottom: -60,
  },
  walletLeft: { flex: 1 },
  walletLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  walletAmount: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 10,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
    marginBottom: 16,
    gap: 5,
  },
  pointsText: { fontSize: 12, color: GOLD, fontWeight: '600' },
  addMoneyBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    alignSelf: 'flex-start',
  },
  addMoneyBtnDisabled: { opacity: 0.6 },
  addMoneyText: { fontSize: 14, fontWeight: '700', color: BROWN },
  walletIllustration: { paddingLeft: 8, opacity: 0.8 },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  cardBody: { fontSize: 13, color: '#666', lineHeight: 20 },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 13, color: ACCENT, fontWeight: '600' },

  // Transactions
  txEmptyBox: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  txEmpty: { fontSize: 14, color: '#999', fontWeight: '600' },
  txEmptySub: { fontSize: 12, color: '#BBB' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  txDate: { fontSize: 11, color: '#999' },
  txAmount: { fontSize: 15, fontWeight: '700' },

  // Secure banner
  secureBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shieldBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BROWN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secureTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  secureSub: { fontSize: 11, color: '#999' },

  // ─── Add Money Sheet ─────────────────────────────────────────────────────────
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    width: '100%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  sheetSub: { fontSize: 13, color: '#888', marginBottom: 20 },

  // 2×2 preset grid
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  presetBtn: {
    width: (SCREEN_W - 40 - 10) / 2, // 2 columns, gap between
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#F5EFE8',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetBtnActive: { backgroundColor: BROWN, borderColor: BROWN },
  presetTxt: { fontSize: 16, fontWeight: '700', color: BROWN },
  presetTxtActive: { color: '#FFF' },

  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0D8CF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
    backgroundColor: '#FDFAF7',
    width: '100%',
  },
  rupeePrefix: { fontSize: 20, fontWeight: '700', color: '#555', marginRight: 6 },
  customInput: { flex: 1, fontSize: 20, fontWeight: '700', color: '#1A1A1A' },

  confirmBtn: {
    backgroundColor: BROWN,
    paddingVertical: 17,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    shadowColor: BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnTxt: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  secureNote: { textAlign: 'center', fontSize: 12, color: '#AAA', marginBottom: 6 },
});
