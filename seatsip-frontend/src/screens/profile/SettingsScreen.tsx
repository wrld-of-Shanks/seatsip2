import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  Platform,
  Linking,
  ImageBackground,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import AppIcon from '../../components/ui/AppIcon';
import { useAppTheme } from '../../theme/ThemeContext';
import { SEATSIP_PRIVACY_POLICY_URL, SEATSIP_TERMS_URL } from '../../constants/legal';
import { ADDRESS_STORAGE_KEY } from '../../constants/storageKeys';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeLog } from '../../security/safeLog';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

// Refactored Components
import { SectionHeader, ToggleRow, ArrowRow, Divider, Icon, LogoutRow } from '../../components/settings/SettingsRows';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { logout, requestAccountDeletion } = useAuth();
  const insets = useSafeAreaInsets();
  const { darkMode, setDarkMode } = useAppTheme();
  const [pushNotifications, setPushNotifications] = useState(false);
  const [locationServices, setLocationServices] = useState(false);
  const [selectedLangLabel, setSelectedLangLabel] = useState('English');
  const [savedAddressCount, setSavedAddressCount] = useState<number | null>(null);

  useEffect(() => {
    // Check initial permissions
    void (async () => {
      try {
        const [loc, push, savedLangCode] = await Promise.all([
          Location.getForegroundPermissionsAsync(),
          Notifications.getPermissionsAsync(),
          AsyncStorage.getItem('seatsip.language')
        ]);
        setLocationServices(loc.status === 'granted');
        setPushNotifications(push.status === 'granted');

        if (savedLangCode) {
          const LANG_LABELS: Record<string, string> = {
            en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
            ar: 'Arabic', de: 'German', ja: 'Japanese', zh: 'Chinese',
            pt: 'Portuguese', ko: 'Korean',
          };
          setSelectedLangLabel(LANG_LABELS[savedLangCode] || 'English');
        }
      } catch (e) {
        safeLog.error('Error loading settings', e);
      }
    })();
  }, []);

  // Refresh language label + address count when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Refresh language
      AsyncStorage.getItem('seatsip.language').then((code) => {
        if (code) {
          const LANG_LABELS: Record<string, string> = {
            en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
            ar: 'Arabic', de: 'German', ja: 'Japanese', zh: 'Chinese',
            pt: 'Portuguese', ko: 'Korean',
          };
          setSelectedLangLabel(LANG_LABELS[code] || 'English');
        }
      }).catch(() => {});

      // Load address count
      AsyncStorage.getItem(ADDRESS_STORAGE_KEY).then((stored) => {
        if (!stored) { setSavedAddressCount(0); return; }
        try {
          const parsed = JSON.parse(stored);
          const addrs = parsed?.addresses;
          setSavedAddressCount(Array.isArray(addrs) ? addrs.length : 0);
        } catch { setSavedAddressCount(0); }
      }).catch(() => setSavedAddressCount(0));
    }, [])
  );

  const togglePushNotifications = async (value: boolean) => {
    if (value) {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Notifications Required',
            'Please enable notifications in your device settings to stay updated with your orders.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => void (Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings()) }
            ]
          );
          setPushNotifications(false);
          return;
        }
        setPushNotifications(true);
      } catch (e) {
        safeLog.error('Error requesting notification permissions', e);
        setPushNotifications(false);
      }
    } else {
      setPushNotifications(false);
    }
  };

  const toggleLocationServices = async (value: boolean) => {
    if (value) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Required',
            'Please enable location permissions in your device settings to get better recommendations.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => void (Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings()) }
            ]
          );
          setLocationServices(false);
          return;
        }
        setLocationServices(true);
      } catch (e) {
        safeLog.error('Error requesting location permissions', e);
        setLocationServices(false);
      }
    } else {
      setLocationServices(false);
    }
  };

  const handleDeleteAccount = () => {
    const run = async () => {
      try {
        await requestAccountDeletion();
        Alert.alert('Signed out', 'Your account deletion has been scheduled. You can restore it within 30 days using the same email.');
      } catch (e: any) {
        Alert.alert('Could not delete account', e?.response?.data?.message || 'Please try again later.');
      }
    };

    Alert.alert(
      'Delete account',
      'This schedules permanent deletion after 30 days. You can cancel by signing in again before then.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void run() },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => void logout() }
      ]
    );
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/app_bg.png')} 
      style={styles.safe}
      resizeMode="cover"
    >
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <AppIcon name="back" size={18} color="#333" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Settings</Text>
              <Text style={styles.headerSubtitle}>Manage your preferences and account.</Text>
            </View>
          </View>

          {/* GENERAL */}
          <View style={styles.section}>
            <SectionHeader title="GENERAL" />
            <ToggleRow
              icon="🔔"
              bg="#FFF3E0"
              title="Push Notifications"
              subtitle="Stay updated with order & offers"
              value={pushNotifications}
              onValueChange={(v) => {
                void togglePushNotifications(v);
              }}
            />
            <Divider />
            {/* <ToggleRow
              icon="🌙"
              bg="#EDE7F6"
              title="Dark Mode"
              subtitle="Switch to dark theme"
              value={darkMode}
              onValueChange={(v) => {
                void setDarkMode(v);
              }}
            />
            <Divider /> */}
            <ToggleRow
              icon="📍"
              bg="#E8F5E9"
              title="Location Services"
              subtitle="Improve recommendations"
              value={locationServices}
              onValueChange={(v) => {
                void toggleLocationServices(v);
              }}
            />
          </View>

          {/* ACCOUNT */}
          <View style={styles.section}>
            <SectionHeader title="ACCOUNT" />
            <ArrowRow
              icon="🔒"
              bg="#FFF8E1"
              title="Change Password"
              subtitle="Update your account password"
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <Divider />
            <ArrowRow
              icon="🌐"
              bg="#E3F2FD"
              title="Language"
              subtitle={selectedLangLabel}
              onPress={() => navigation.navigate('LanguageSelect')}
            />
            <Divider />
            <ArrowRow
              icon="🗑️"
              bg="#FFEBEE"
              title="Clear Cache"
              subtitle="Free up storage space"
              rightText={
                savedAddressCount === null ? 'Loading…'
                : savedAddressCount === 0 ? 'No saved addresses'
                : `${savedAddressCount} address${savedAddressCount !== 1 ? 'es' : ''}`
              }
              onPress={() => {
                if (savedAddressCount === 0) {
                  Alert.alert('Nothing to clear', 'Your local cache is already empty.');
                  return;
                }
                Alert.alert(
                  'Clear Cache?',
                  `This will permanently remove your ${savedAddressCount} saved address${savedAddressCount !== 1 ? 'es' : ''} and local temporary data. Your account and settings will remain safe.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear Everything',
                      style: 'destructive',
                      onPress: () => {
                        void (async () => {
                          try {
                            await AsyncStorage.removeItem(ADDRESS_STORAGE_KEY);
                            setSavedAddressCount(0);
                            Alert.alert('Done', 'Your local cache and saved addresses have been cleared.');
                          } catch (e) {
                            safeLog.error('Clear cache failed', e);
                            Alert.alert('Error', 'Could not clear storage. Please try again.');
                          }
                        })();
                      },
                    },
                  ],
                  { cancelable: true }
                );
              }}
            />
            <Divider />
            <ArrowRow
              icon="⚠️"
              bg="#FFEBEE"
              title="Delete account"
              subtitle="Schedule removal (30-day grace period)"
              rightColor="#C62828"
              onPress={handleDeleteAccount}
            />
          </View>

          {/* ABOUT */}
          <View style={styles.section}>
            <SectionHeader title="ABOUT" />
            <ArrowRow
              icon="📱"
              bg="#EDE7F6"
              title="App Version"
              subtitle={Constants.expoConfig?.version ? `Expo ${Constants.expoConfig.version}` : 'Development build'}
              rightText={Constants.expoConfig?.version || '—'}
              rightColor="#4CAF50"
              onPress={() =>
                Alert.alert(
                  'App version',
                  Constants.expoConfig?.version
                    ? `You are running version ${Constants.expoConfig.version}.`
                    : 'Version info is only available in release builds.'
                )
              }
            />
            <Divider />
            <ArrowRow
              icon="📄"
              bg="#E8EAF6"
              title="Privacy Policy"
              subtitle="Read our privacy practices"
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <Divider />
            <ArrowRow
              icon="📋"
              bg="#FFF8E1"
              title="Terms of Service"
              subtitle="Read our terms and conditions"
              onPress={() => navigation.navigate('Terms')}
            />
          </View>

          {/* LOGOUT */}
          <View style={styles.section}>
            <LogoutRow onPress={handleLogout} />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Need help? Visit our{' '}
              <Text style={styles.footerLink} onPress={() => navigation.navigate('HelpCenter' as any)}>Help Center</Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  logoutText: {
    color: '#E53935',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  footerLink: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
});
