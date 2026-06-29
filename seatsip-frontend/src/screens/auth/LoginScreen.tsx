import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ImageBackground,
  Dimensions,
  Animated,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { useGoogleIdTokenAuth, isGoogleClientConfigured } from '../../services/auth/googleAuth';
import { GoogleButton } from '../../components/ui/GoogleButton';
import { formatAuthApiError } from '../../utils/authErrors';

const { width, height } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogleIdToken } = useAuth();
  const { request, promptForIdToken } = useGoogleIdTokenAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setEmail('');
      setPassword('');
      setShowPass(false);
    }, [])
  );

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'rnw-autofill-override';
      let style = document.getElementById(styleId) as HTMLStyleElement;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.type = 'text/css';
        document.head.appendChild(style);
      }
      style.innerHTML = `
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active,
        input[type="text"]:-webkit-autofill,
        input[type="email"]:-webkit-autofill,
        input[type="password"]:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #2a2a2a inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 999999s ease-in-out 0s, color 999999s ease-in-out 0s;
        }
      `;
    }
  }, []);

  const handleLogin = async () => {
    if (loading) return;
    console.log('[Login] Login attempt started');
    if (!email.trim() || !password) {
      console.log('[Login] Missing fields');
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }
    try {
      console.log('[Login] Calling login service...', { email: email.trim().toLowerCase() });
      setLoading(true);
      await login(email.trim().toLowerCase(), password);
      console.log('[Login] Login successful! (App.tsx will now redirect)');
    } catch (err: any) {
      const errorMsg = formatAuthApiError(err);
      console.error('[Login] Login failed error:', err);
      console.error('[Login] Formatted error:', errorMsg);
      Alert.alert('Login failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleClientConfigured()) {
      Alert.alert('Google Sign-In', 'Google client IDs are not configured in the app build.');
      return;
    }
    try {
      setLoading(true);
      const idToken = await promptForIdToken();
      await loginWithGoogleIdToken(idToken);
      console.log('[Login] Google Sign-In successful! (App.tsx will now redirect)');
    } catch (err: unknown) {
      const msg = formatAuthApiError(err);
      if (!/cancel/i.test(msg)) {
        Alert.alert('Google Sign-In', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require('../../../assets/images/auth_bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ height: height * 0.15 }} />

            {/* Login Card */}
            <View style={styles.cardWrapper}>
              <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.welcomeTitle}>Welcome back</Text>
                  <Text style={styles.welcomeSub}>Sign in to continue</Text>

                   {/* Email Field */}
                  <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
                    <View style={styles.iconBox}>
                      <Mail size={18} color="#f0f0f0" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </View>

                  {/* Password Field */}
                  <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
                    <View style={styles.iconBox}>
                      <Lock size={18} color="#f0f0f0" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPass(!showPass)}
                      style={styles.eyeToggle}
                    >
                      {showPass ? (
                        <EyeOff size={18} color="#f0f0f0" />
                      ) : (
                        <Eye size={18} color="#f0f0f0" />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={styles.forgotBtn}
                    onPress={() => navigation.navigate('ForgotPassword')}
                  >
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>

                  {/* Primary Action */}
                  <TouchableOpacity
                    style={styles.signInBtn}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.signInText}>Sign In</Text>
                        <ArrowRight size={20} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {!request && !loading ? (
                    <Text style={styles.googlePrep}>Preparing Google Sign-In…</Text>
                  ) : null}

                  <GoogleButton
                    onPress={handleGoogleSignIn}
                    disabled={loading || !request}
                    loading={loading}
                    style={{ marginBottom: 32 }}
                  />

                  {/* Footer */}
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                      <Text style={styles.footerLink}>Sign up</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </View>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgImage: {
    width,
    height,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 8,
    textAlign: 'center',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  subtitleLine: {
    height: 1,
    width: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 4,
    marginHorizontal: 10,
  },
  cardWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    width: '100%',
  },
  cardContent: {
    padding: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#444444',
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 60,
  },
  inputContainerFocused: {
    borderColor: '#8B9D5E',
    backgroundColor: '#2a2a2a',
  },
  iconBox: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#f0f0f0',
    fontSize: 16,
    height: '100%',
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  eyeToggle: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#8B9D5E',
    fontSize: 14,
    fontWeight: '600',
  },
  signInBtn: {
    backgroundColor: '#8B9D5E',
    height: 60,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
    fontSize: 14,
  },
  googlePrep: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
  footerLink: {
    color: '#8B9D5E',
    fontSize: 15,
    fontWeight: '700',
  },
});
