import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';

const LANG_STORAGE_KEY = 'seatsip.language';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta },
};

const detectLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (stored) return stored;
  } catch {}
  return 'en';
};

const initI18n = async () => {
  const lng = await detectLanguage();
  i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
};

export const changeLanguage = async (code: string) => {
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, code);
  } catch {}
};

initI18n();

export default i18n;
