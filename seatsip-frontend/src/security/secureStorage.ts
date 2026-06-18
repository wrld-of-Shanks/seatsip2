import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isKeychainAvailable = Platform.OS !== 'web' && !!NativeModules.RNKeychainManager;
const Keychain = isKeychainAvailable ? require('react-native-keychain') : null;

const AUTH_SERVICE = 'in.seatsip.auth';
const LEGACY_WEB_TOKEN_KEY = '@seatsip:tokens';
const FALLBACK_TOKEN_KEY = '@seatsip:fallback_tokens';

export interface StoredTokens {
  accessToken: string;
  /** Native / non-browser clients; browsers use httpOnly cookie when server omits this. */
  refreshToken?: string;
}

let webMemoryTokens: StoredTokens | null = null;
let webLegacyMigrated = false;

async function migrateLegacyWebTokensOnce(): Promise<void> {
  if (Platform.OS !== 'web' || webLegacyMigrated) return;
  webLegacyMigrated = true;
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_WEB_TOKEN_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as StoredTokens;
      if (parsed?.accessToken) {
        webMemoryTokens = {
          accessToken: parsed.accessToken,
          ...(parsed.refreshToken ? { refreshToken: parsed.refreshToken } : {}),
        };
      }
      await AsyncStorage.removeItem(LEGACY_WEB_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  if (Platform.OS === 'web') {
    await migrateLegacyWebTokensOnce();
    webMemoryTokens = {
      accessToken: tokens.accessToken,
      ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
    };
    return;
  }

  if (isKeychainAvailable && Keychain) {
    try {
      // Store securely — accessible when device is unlocked (no biometric prompt required for reads)
      await Keychain.setGenericPassword(
        'tokens',
        JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || '' }),
        {
          service: AUTH_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );
      return;
    } catch (e) {
      console.warn('[secureStorage] Keychain set failed, using AsyncStorage fallback:', e);
    }
  }

  // Fallback to AsyncStorage (e.g. inside Expo Go)
  await AsyncStorage.setItem(
    FALLBACK_TOKEN_KEY,
    JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || '' })
  );
}

export async function loadTokens(): Promise<StoredTokens | null> {
  if (Platform.OS === 'web') {
    await migrateLegacyWebTokensOnce();
    return webMemoryTokens;
  }

  if (isKeychainAvailable && Keychain) {
    try {
      const result = await Keychain.getGenericPassword({ service: AUTH_SERVICE });
      if (result) {
        const parsed = JSON.parse(result.password) as { accessToken: string; refreshToken?: string };
        if (parsed?.accessToken) {
          return {
            accessToken: parsed.accessToken,
            ...(parsed.refreshToken ? { refreshToken: parsed.refreshToken } : {}),
          };
        }
      }
    } catch (e) {
      console.warn('[secureStorage] Keychain load failed, trying AsyncStorage fallback:', e);
    }
  }

  // Fallback loading from AsyncStorage
  try {
    const fallback = await AsyncStorage.getItem(FALLBACK_TOKEN_KEY);
    if (fallback) {
      const parsed = JSON.parse(fallback) as { accessToken: string; refreshToken?: string };
      if (parsed?.accessToken) {
        return {
          accessToken: parsed.accessToken,
          ...(parsed.refreshToken ? { refreshToken: parsed.refreshToken } : {}),
        };
      }
    }
  } catch {}
  return null;
}

export async function clearTokens(): Promise<void> {
  if (Platform.OS === 'web') {
    webMemoryTokens = null;
    try {
      await AsyncStorage.removeItem(LEGACY_WEB_TOKEN_KEY);
    } catch {
      /* ignore */
    }
    return;
  }

  if (isKeychainAvailable && Keychain) {
    try {
      await Keychain.resetGenericPassword({ service: AUTH_SERVICE });
      return;
    } catch (e) {
      console.warn('[secureStorage] Keychain reset failed, clearing AsyncStorage fallback:', e);
    }
  }

  try {
    await AsyncStorage.removeItem(FALLBACK_TOKEN_KEY);
  } catch {}
}
