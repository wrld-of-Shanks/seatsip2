import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { ordersApi, authApi, cafesApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { Button, Divider } from '../../components/ui';
import AppIcon from '../../components/ui/AppIcon';
import RazorpayCheckout from 'react-native-razorpay';
import { requireBiometric } from '../../security/deviceSecurity';

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



type Nav = NativeStackNavigationProp<RootStackParamList>;
type PaymentMethod = 'WALLET' | 'UPI' | 'CARD';
type UpiProvider = 'GPAY' | 'PHONEPE' | 'PAYTM' | 'UPI_ID';

type RazorpayAuthPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

async function confirmPaymentGate(prompt: string): Promise<boolean> {
  const ok = await requireBiometric(prompt);
  if (ok) return true;
  if (Platform.OS !== 'web') return false;
  const pwd =
    typeof window !== 'undefined' && typeof window.prompt === 'function'
      ? window.prompt('Enter your account password to continue', '')
      : '';
  if (!pwd) return false;
  try {
    const { data } = await authApi.verifyPassword(pwd);
    return data.data?.valid === true;
  } catch (e: any) {
    if (e?.response?.status === 400) {
      Alert.alert(
        'Cannot verify here',
        'Google sign-in accounts cannot use password verification in the browser. Please use the mobile app to pay.'
      );
    }
    return false;
  }
}

const ORDER_TYPES = [
  { id: 'DINE_IN', label: 'Dine In', icon: '🪑' },
  { id: 'TAKEOUT', label: 'Takeout', icon: '🥡' },
  { id: 'DELIVERY', label: 'Delivery', icon: '🚚' },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; hint: string }[] = [
  { id: 'WALLET', label: 'Wallet', icon: '👛', hint: 'Use SeatSip balance' },
  { id: 'UPI', label: 'UPI', icon: '📱', hint: 'Google Pay, PhonePe, Paytm' },
  { id: 'CARD', label: 'Card', icon: '💳', hint: 'Debit or credit card' },
];

const UPI_PROVIDERS: { id: UpiProvider; label: string; scheme?: string }[] = [
  { id: 'GPAY', label: 'Google Pay', scheme: 'tez://upi/pay' },
  { id: 'PHONEPE', label: 'PhonePe', scheme: 'phonepe://pay' },
  { id: 'PAYTM', label: 'Paytm', scheme: 'paytmmp://pay' },
  { id: 'UPI_ID', label: 'UPI ID' },
];

export default function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { cart, clearCart } = useCart();
  const { user, refreshUser } = useAuth();

  const [orderType, setOrderType] = useState('DINE_IN');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WALLET');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [upiProvider, setUpiProvider] = useState<UpiProvider>('GPAY');
  const [upiId, setUpiId] = useState('');
  const [upiReference, setUpiReference] = useState('');
  const [upiOpened, setUpiOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [razorpayAuth, setRazorpayAuth] = useState<RazorpayAuthPayload | null>(null);
  const [merchantUpiId, setMerchantUpiId] = useState('seatsip@upi');
  const [merchantName, setMerchantName] = useState('SeatSip');

  const cartItems = cart?.items || [];
  const hasCart = cartItems.length > 0;
  const cafeId = cartItems[0]?.cafe_id || '';
  const deliveryFee = orderType === 'DELIVERY' ? 40 : 0;
  const finalTotal = (cart?.total || 0) + deliveryFee;
  const walletBalance = Number(user?.wallet_balance) || 0;

  const paymentReady =
    paymentMethod === 'WALLET'
      ? walletBalance >= finalTotal
      : razorpayAuth !== null;

  useEffect(() => {
    setRazorpayAuth(null);
  }, [paymentMethod, orderType, finalTotal, upiProvider]);

  useEffect(() => {
    if (!cafeId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await cafesApi.getPaymentConfig(cafeId);
        const cfg = data?.data as { upiId?: string; merchantName?: string } | undefined;
        if (cancelled || !cfg) return;
        if (cfg.upiId) setMerchantUpiId(cfg.upiId);
        if (cfg.merchantName) setMerchantName(cfg.merchantName);
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  const paymentHelperText = useMemo(() => {
    if (paymentMethod === 'WALLET') {
      if (walletBalance >= finalTotal) return `Wallet will be debited ₹${finalTotal.toFixed(0)}.`;
      return `Wallet has ₹${walletBalance.toFixed(0)}. Add ₹${(finalTotal - walletBalance).toFixed(0)} to continue.`;
    }

    if (paymentMethod === 'CARD') {
      if (razorpayAuth) return 'Card payment authorized. Tap below to place your order.';
      return 'Authorize card payment with Razorpay (secure hosted checkout), then place your order.';
    }

    if (razorpayAuth) return 'UPI payment authorized. Tap below to place your order.';

    if (upiProvider === 'UPI_ID') {
      return 'Tap "Authorize with Razorpay" to pay with your UPI ID (verified at checkout).';
    }

    return upiOpened
      ? 'Tap "Authorize with Razorpay" to complete UPI payment, then place your order.'
      : `Open your UPI app if you like, then authorize ₹${finalTotal.toFixed(0)} with Razorpay.`;
  }, [finalTotal, paymentMethod, razorpayAuth, upiOpened, upiProvider, walletBalance]);

  useEffect(() => {
    if (!hasCart) navigation.goBack();
  }, [hasCart, navigation]);

  const buildUpiUrl = (scheme = 'upi://pay') => {
    const params = {
      pa: merchantUpiId,
      pn: merchantName,
      am: finalTotal.toFixed(2),
      cu: 'INR',
      tn: `SeatSip order at ${cartItems[0]?.cafe_name || 'cafe'}`,
    };
    const query = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    return `${scheme}?${query}`;
  };

  const handleOpenUpi = async () => {
    const provider = UPI_PROVIDERS.find(p => p.id === upiProvider);
    if (!provider?.scheme) return;

    const appUrl = buildUpiUrl(provider.scheme);
    const fallbackUrl = buildUpiUrl();

    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpenApp ? appUrl : fallbackUrl);
      setUpiOpened(true);
    } catch {
      Alert.alert(
        'Could not open UPI app',
        'Please check that a UPI app is installed, or choose UPI ID and complete the payment manually.'
      );
    }
  };

  const openRazorpayCheckout = useCallback(async (): Promise<RazorpayAuthPayload> => {
    const intent = await ordersApi.createPaymentIntent({ cafe_id: cafeId, order_type: orderType });
    const orderData = intent.data.data;
    const formattedContact = cleanPhone(user?.phone);

    if (Platform.OS === 'web') {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }
      return new Promise<RazorpayAuthPayload>((resolve, reject) => {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: merchantName,
          description: `SeatSip order at ${cartItems[0]?.cafe_name || 'cafe'}`,
          order_id: orderData.orderId,
          prefill: { name: user?.name, email: user?.email, contact: formattedContact },
          theme: { color: Colors.accent },
          config: {
            display: {
              hide: [
                ...(paymentMethod === 'UPI' ? [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' },
                  { method: 'paylater' },
                  { method: 'emi' }
                ] : []),
                ...(paymentMethod === 'CARD' ? [
                  { method: 'upi' },
                  { method: 'netbanking' },
                  { method: 'wallet' },
                  { method: 'paylater' },
                  { method: 'emi' }
                ] : []),
              ],
              preferences: {
                show_default_blocks: true
              }
            }
          },
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
    }

    try {
      const checkout = await RazorpayCheckout.open({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: merchantName,
        description: `SeatSip order at ${cartItems[0]?.cafe_name || 'cafe'}`,
        order_id: orderData.orderId,
        prefill: { name: user?.name, email: user?.email, contact: formattedContact },
        theme: { color: Colors.accent },
        config: {
          display: {
            hide: [
              ...(paymentMethod === 'UPI' ? [
                { method: 'card' },
                { method: 'netbanking' },
                { method: 'wallet' },
                { method: 'paylater' },
                { method: 'emi' }
              ] : []),
              ...(paymentMethod === 'CARD' ? [
                { method: 'upi' },
                { method: 'netbanking' },
                { method: 'wallet' },
                { method: 'paylater' },
                { method: 'emi' }
              ] : []),
            ],
            preferences: {
              show_default_blocks: true
            }
          }
        },
      });
      return {
        razorpay_order_id: checkout.razorpay_order_id,
        razorpay_payment_id: checkout.razorpay_payment_id,
        razorpay_signature: checkout.razorpay_signature,
      };
    } catch (err: any) {
      if (__DEV__ && Platform.OS !== 'web') {
        return new Promise<RazorpayAuthPayload>((resolve, reject) => {
          Alert.alert(
            'Dev Mode (Expo Go)',
            'Razorpay native module is not linked in Expo Go. Simulate a successful payment?',
            [
              {
                text: 'Simulate',
                onPress: () => {
                  resolve({
                    razorpay_order_id: orderData.orderId,
                    razorpay_payment_id: `dev_pay_${Date.now()}`,
                    razorpay_signature: 'dev_bypass',
                  });
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => reject(new Error('Payment cancelled or simulated payment rejected')),
              },
            ]
          );
        });
      }
      throw err;
    }
  }, [cafeId, cartItems, merchantName, orderType, paymentMethod, user?.email, user?.name, user?.phone]);


  const handleAuthorizeRazorpay = async () => {
    try {
      setLoading(true);
      const biometricOk = await confirmPaymentGate('Authorize payment');
      if (!biometricOk) {
        Alert.alert('Payment cancelled', 'Biometric or password confirmation was not completed.');
        return;
      }
      const auth = await openRazorpayCheckout();
      setRazorpayAuth(auth);
    } catch (err: any) {
      Alert.alert('Authorization failed', err?.response?.data?.message || err?.message || 'Razorpay could not complete.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!paymentReady) {
      Alert.alert('Payment incomplete', paymentHelperText);
      return;
    }

    try {
      setLoading(true);
      const biometricOk = await confirmPaymentGate(paymentMethod === 'WALLET' ? 'Confirm wallet payment' : 'Confirm payment');
      if (!biometricOk) {
        Alert.alert('Payment cancelled', 'Biometric or password confirmation was not completed.');
        return;
      }
      const items = cartItems.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity }));

      let paymentDetails: RazorpayAuthPayload | undefined;
      if (paymentMethod === 'UPI' || paymentMethod === 'CARD') {
        paymentDetails = razorpayAuth || undefined;
        if (!paymentDetails) {
          Alert.alert('Payment incomplete', 'Authorize payment with Razorpay first.');
          return;
        }
      }

      const { data } = await ordersApi.create({
        cafe_id: cafeId,
        items,
        order_type: orderType,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        special_instructions: specialInstructions.trim() || undefined,
      });
      await clearCart();
      await refreshUser();
      navigation.replace('OrderConfirmed', { orderId: data.data.id });
    } catch (err: any) {
      Alert.alert('Order failed', err?.response?.data?.message || 'Please check the payment details and try again.');
    } finally {
      setLoading(false);
    }
  };


  if (!hasCart) {
    return null;
  }

  return (
    <ImageBackground 
      source={require('../../assets/images/app_bg.png')} 
      style={styles.rootImage}
      resizeMode="cover"
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <AppIcon name="back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 172 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Order Type</Text>
          <View style={styles.optionRow}>
            {ORDER_TYPES.map(o => (
              <TouchableOpacity
                key={o.id}
                onPress={() => setOrderType(o.id)}
                style={[styles.option, orderType === o.id && styles.optionActive]}
                activeOpacity={0.8}
              >
                <View style={styles.optionInner}>
                  <AppIcon name={o.icon} size={16} color={orderType === o.id ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.optionText, orderType === o.id && styles.optionTextActive]}>{o.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>How Are You Paying?</Text>
          <View style={styles.paymentList}>
            {PAYMENT_METHODS.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPaymentMethod(p.id)}
                style={[styles.paymentOption, paymentMethod === p.id && styles.paymentOptionActive]}
                activeOpacity={0.82}
              >
                <View style={styles.paymentIcon}>
                  <AppIcon name={p.icon} size={20} color={paymentMethod === p.id ? Colors.primary : Colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentLabel, paymentMethod === p.id && styles.optionTextActive]}>{p.label}</Text>
                  <Text style={styles.paymentHint}>{p.hint}</Text>
                </View>
                <View style={[styles.radio, paymentMethod === p.id && styles.radioActive]}>
                  {paymentMethod === p.id && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.paymentCard}>
            {paymentMethod === 'WALLET' && (
              <>
                <View style={styles.walletInfo}>
                  <View>
                    <Text style={styles.smallLabel}>Wallet Balance</Text>
                    <Text style={styles.walletAmount}>₹{walletBalance.toFixed(0)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('WalletScreen')} style={styles.secondaryPill}>
                    <Text style={styles.secondaryPillText}>Top Up</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.helperText, walletBalance < finalTotal && styles.errorText]}>{paymentHelperText}</Text>
              </>
            )}

            {paymentMethod === 'CARD' && (
              <>
                <View style={styles.methodHeader}>
                  <Text style={styles.methodTitle}>Card</Text>
                  <Text style={styles.secureText}>Razorpay Checkout</Text>
                </View>
                <Text style={[styles.helperText, !razorpayAuth && styles.errorText]}>{paymentHelperText}</Text>
                {!razorpayAuth && (
                  <Button
                    title={`Authorize ₹${finalTotal.toFixed(0)} with Razorpay`}
                    onPress={handleAuthorizeRazorpay}
                    loading={loading}
                    fullWidth
                    style={{ marginTop: Spacing.md }}
                    icon={<AppIcon name="lock" size={18} color="#fff" />}
                  />
                )}
              </>
            )}

            {paymentMethod === 'UPI' && (
              <>
                <View style={styles.methodHeader}>
                  <Text style={styles.methodTitle}>UPI Payment</Text>
                  <Text style={styles.secureText}>Razorpay Gateway</Text>
                </View>
                <Text style={[styles.helperText, !razorpayAuth && styles.errorText]}>{paymentHelperText}</Text>
                {!razorpayAuth && (
                  <Button
                    title={`Authorize ₹${finalTotal.toFixed(0)} with Razorpay`}
                    onPress={handleAuthorizeRazorpay}
                    loading={loading}
                    fullWidth
                    style={{ marginTop: Spacing.md }}
                    icon={<AppIcon name="lock" size={18} color="#fff" />}
                  />
                )}
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="No onions, less sugar, table notes..."
            placeholderTextColor={Colors.textMuted}
            style={[styles.input, styles.notesInput]}
            multiline
          />

          <Text style={styles.sectionTitle}>Items ({cartItems.length})</Text>
          <View style={styles.summaryCard}>
            {cartItems.map(item => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.summaryName}>{item.quantity}x {item.name}</Text>
                <Text style={styles.summaryPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text>₹{(cart?.subtotal || 0).toFixed(0)}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>GST (5%)</Text><Text>₹{(cart?.tax || 0).toFixed(0)}</Text></View>
            {deliveryFee > 0 && <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery Fee</Text><Text>₹{deliveryFee}</Text></View>}
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalVal}>₹{finalTotal.toFixed(0)}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={[styles.footerHint, !paymentReady && styles.errorText]} numberOfLines={2}>{paymentHelperText}</Text>
        <Button
          title={loading ? 'Processing Payment...' : `Pay & Place Order  ₹${finalTotal.toFixed(0)}`}
          onPress={handlePlaceOrder}
          loading={loading}
          disabled={!paymentReady}
          fullWidth
          size="lg"
        />
      </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  rootImage: { flex: 1, width: '100%' },
  root: { flex: 1, width: '100%' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, ...Shadow.sm,
  },
  iconButton: {
    width: 40, height: 40, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginTop: Spacing.base, marginBottom: Spacing.sm },
  optionRow: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  optionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  optionInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  optionTextActive: { color: Colors.primary, fontWeight: Typography.bold },
  paymentList: { gap: 10 },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md,
  },
  paymentOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  paymentIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  paymentLabel: { fontSize: Typography.base, color: Colors.textPrimary, fontWeight: Typography.semibold },
  paymentHint: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  paymentCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  walletInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  smallLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginBottom: 2 },
  walletAmount: { fontSize: Typography.xl, color: Colors.textPrimary, fontWeight: Typography.extrabold },
  secondaryPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  secondaryPillText: { color: Colors.accentDark, fontSize: Typography.sm, fontWeight: Typography.bold },
  methodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  methodTitle: { fontSize: Typography.base, color: Colors.textPrimary, fontWeight: Typography.bold },
  secureText: { fontSize: Typography.xs, color: Colors.success, fontWeight: Typography.semibold },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: Typography.base,
    marginTop: Spacing.sm,
  },
  inputRow: { flexDirection: 'row', gap: 10, width: '100%' },
  splitInput: { flex: 1, flexBasis: 0, minWidth: 0 },
  notesInput: { minHeight: 82, textAlignVertical: 'top' },
  helperText: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 17 },
  errorText: { color: Colors.error },
  upiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  upiOption: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  upiOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  upiText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.semibold },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 12 },
  summaryName: { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1 },
  summaryPrice: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  summaryLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  totalLabel: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },
  totalVal: { fontSize: Typography.md, fontWeight: Typography.extrabold, color: Colors.accent },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, padding: Spacing.base,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  footerHint: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
});
