import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage } from '../../i18n';
import AppIcon from '../../components/ui/AppIcon';
import { safeLog } from '../../security/safeLog';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇦' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇦🇪' },
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷' },
];

export default function LanguageSelectScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [selectedCode, setSelectedCode] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem('seatsip.language')
      .then((code) => { if (code) setSelectedCode(code); })
      .catch(() => {});
  }, []);

  const handleSelect = async (code: string) => {
    setSelectedCode(code);
    try {
      await changeLanguage(code);
    } catch (e) {
      safeLog.error('Error saving language', e);
    }
    setTimeout(() => navigation.goBack(), 220);
  };

  return (
    <ImageBackground
      source={require('../../assets/images/app_bg.png')}
      style={styles.root}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1, width: '100%' }}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <AppIcon name="back" size={18} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t('profile.language')}</Text>
            <Text style={styles.headerSubtitle}>{t('profile.language')}</Text>
          </View>
        </View>

        {/* Language list */}
        <FlatList
          data={LANGUAGES}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = selectedCode === item.code;
            return (
              <TouchableOpacity
                style={[styles.item, isSelected && styles.itemActive]}
                onPress={() => handleSelect(item.code)}
                activeOpacity={0.75}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <View style={styles.itemText}>
                  <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>
                    {item.label}
                  </Text>
                  <Text style={styles.itemNative}>{item.native}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkCircle}>
                    <AppIcon name="check" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%' },
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
  headerText: { flex: 1 },
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
  listContent: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  itemActive: {
    backgroundColor: '#FFF8F0',
  },
  flag: {
    fontSize: 26,
    width: 34,
    textAlign: 'center',
  },
  itemText: { flex: 1 },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 1,
  },
  itemLabelActive: {
    color: '#C17D2E',
  },
  itemNative: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#C17D2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F5F5F5',
    marginLeft: 64,
  },
});
