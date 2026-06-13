import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { UnreadNotificationsProvider, useUnreadNotifications } from './src/context/UnreadNotificationsContext';
import { RootStackParamList, TabParamList } from './src/navigation/types';
import { Colors } from './src/theme';

// Screens
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import LoadingScreen from './src/screens/auth/LoadingScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import ExploreScreen from './src/screens/explore/ExploreScreen';
import OrdersScreen from './src/screens/orders/OrdersScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import CafeDetailScreen from './src/screens/cafe/CafeDetailScreen';
import MenuScreen from './src/screens/cafe/MenuScreen';
import TableSelectScreen from './src/screens/reservations/TableSelectScreen';
import ReservationDetailsScreen from './src/screens/reservations/ReservationDetailsScreen';
import BookingConfirmedScreen from './src/screens/reservations/BookingConfirmedScreen';
import CartScreen from './src/screens/orders/CartScreen';
import CheckoutScreen from './src/screens/orders/CheckoutScreen';
import OrderConfirmedScreen from './src/screens/orders/OrderConfirmedScreen';
import OrderTrackingScreen from './src/screens/orders/OrderTrackingScreen';
import MapScreen from './src/screens/explore/MapScreen';
import SearchScreen from './src/screens/explore/SearchScreen';
import DiscoverScreen from './src/screens/explore/DiscoverScreen';
import SettingsScreen from './src/screens/profile/SettingsScreen';
import RewardsScreen from './src/screens/rewards/RewardsScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';
import NotificationsScreen from './src/screens/profile/NotificationsScreen';
import PaymentsWalletScreen from './src/screens/profile/PaymentsWalletScreen';
import ReservationHistoryScreen from './src/screens/reservations/ReservationHistoryScreen';
import MyOrdersScreen from './src/screens/orders/MyOrdersScreen';
import HelpCenterScreen from './src/screens/profile/HelpCenterScreen';
import TermsScreen from './src/screens/profile/TermsScreen';
import PrivacyPolicyScreen from './src/screens/profile/PrivacyPolicyScreen';
import SupportChatScreen from './src/screens/profile/SupportChatScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
// import MenuItemDetailScreen from './src/screens/cafe/MenuItemDetailScreen';
import PreOrderMenuScreen from './src/screens/reservations/PreOrderMenuScreen';
import CafeListScreen from './src/screens/home/CafeListScreen';
import PopularItemsScreen from './src/screens/home/PopularItemsScreen';
import ExploreItemsScreen from './src/screens/explore/ExploreItemsScreen';
import AllRewardsScreen from './src/screens/rewards/AllRewardsScreen';
import ChangePasswordScreen from './src/screens/profile/ChangePasswordScreen';
import LanguageSelectScreen from './src/screens/profile/LanguageSelectScreen';
import CafeGalleryScreen from './src/screens/cafe/CafeGalleryScreen';
import { RootErrorBoundary } from './src/components/RootErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

import { TouchableOpacity, Text, View, StyleSheet, Platform, UIManager, LayoutAnimation } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Map as MapIcon, Utensils, Gift, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Courgette_400Regular } from '@expo-google-fonts/courgette';
import { Fredoka_700Bold, Fredoka_400Regular } from '@expo-google-fonts/fredoka';
import AppIcon from './src/components/ui/AppIcon';
import { SecureAppShell } from './src/security/SecureAppShell';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TAB_ICONS: Record<string, { label: string; Icon: any }> = {
  Home: { label: 'Home', Icon: Home },
  MapScreen: { label: 'Map', Icon: MapIcon },
  ExploreTab: { label: 'Explore', Icon: Utensils },
  Rewards: { label: 'Rewards', Icon: Gift },
  Profile: { label: 'Profile', Icon: User },
};

function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadNotifications();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom || 16 }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tabData = TAB_ICONS[route.name];

          if (!tabData) return null;
          const { label, Icon } = tabData;

          const onPress = () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={route.name === 'Profile' && unreadCount > 0 ? `${label}, ${unreadCount} unread notifications` : label}
              style={[
                styles.tabButton,
                isFocused ? styles.tabButtonActive : styles.tabButtonInactive,
              ]}
            >
              <View style={styles.tabIconWrap}>
                <Icon
                  size={20}
                  strokeWidth={isFocused ? 2 : 1.5}
                  color={isFocused ? '#2A1A0E' : 'rgba(245, 237, 214, 0.6)'}
                />
              </View>
              {isFocused && (
                <Text style={styles.tabLabel} numberOfLines={1}>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MapScreen" component={MapScreen} />
      <Tab.Screen name="ExploreTab" component={ExploreScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function ThemedNavigationShell({ children }: { children: React.ReactNode }) {
  const { darkMode } = useAppTheme();
  const theme = darkMode ? DarkTheme : DefaultTheme;
  return (
    <NavigationContainer theme={theme}>
      {children}
    </NavigationContainer>
  );
}

function Navigation() {
  const { user, isLoading } = useAuth();
  const [minLoading, setMinLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isLoading) {
      // Keep loading screen for at least 1.5s for a premium feel
      const timer = setTimeout(() => {
        setMinLoading(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!user ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="CafeDetail" component={CafeDetailScreen} />
          <Stack.Screen name="CafeGallery" component={CafeGalleryScreen} />
          <Stack.Screen name="Menu" component={MenuScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="OrderConfirmed" component={OrderConfirmedScreen} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          <Stack.Screen name="TableSelect" component={TableSelectScreen} />
          <Stack.Screen name="ReservationDetails" component={ReservationDetailsScreen} />
          <Stack.Screen name="PreOrderMenu" component={PreOrderMenuScreen} />
          <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} />
          {/* <Stack.Screen name="ProductDetail" component={MenuItemDetailScreen} /> */}
          <Stack.Screen name="Discover" component={DiscoverScreen} />
          
          {/* Placeholders for other screens */}
          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          <Stack.Screen name="WalletScreen" component={PaymentsWalletScreen} />
          <Stack.Screen name="ReservationHistory" component={ReservationHistoryScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="OrderHistory" component={MyOrdersScreen} />
          <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="SupportChat" component={SupportChatScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
        </>
      )}
      <Stack.Screen name="CafeList" component={CafeListScreen} />
      <Stack.Screen name="PopularItems" component={PopularItemsScreen} />
      <Stack.Screen name="ExploreItems" component={ExploreItemsScreen} />
      <Stack.Screen name="AllRewards" component={AllRewardsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Courgette_400Regular,
    Fredoka_700Bold,
    Fredoka_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SecureAppShell>
        <ThemeProvider>
          <AuthProvider>
            <UnreadNotificationsProvider>
              <CartProvider>
                <RootErrorBoundary>
                  <View style={{ flex: 1 }}>
                    <OfflineBanner />
                    <ThemedNavigationShell>
                      <Navigation />
                      <StatusBar style="auto" />
                    </ThemedNavigationShell>
                  </View>
                </RootErrorBoundary>
              </CartProvider>
            </UnreadNotificationsProvider>
          </AuthProvider>
        </ThemeProvider>
      </SecureAppShell>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 8,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6B3F1A',
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 340,
    height: 56,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
    }),
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    height: 44,
  },
  tabButtonInactive: {
    flex: 1,
  },
  tabButtonActive: {
    backgroundColor: '#F5EDD6',
    paddingHorizontal: 14,
    gap: 6,
  },
  tabIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C62828',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A1A0E',
  },
});
