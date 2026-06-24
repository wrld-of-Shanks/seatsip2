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
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Mail, Lock, Eye, EyeOff, KeyRound, ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/types';
import { formatAuthApiError } from '../../utils/authErrors';

const { width, height } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  // Step 1: 'request' (email), Step 2: 'reset' (otp + passwords)
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordWarning, setPasswordWarning] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStep('request');
      setEmail('');
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setPasswordWarning('');
      setShowPass(false);
      setShowConfirmPass(false);
    }, [])
  );

  useEffect(() => {
    if (!password) {
      setPasswordWarning('');
    } else if (password.length < 10) {
      setPasswordWarning('Password must be at least 10 characters');
    } else if (/^password\d{0,5}$/i.test(password) || /^123456/i.test(password)) {
      setPasswordWarning('This is similar to a commonly used password');
    } else if (!/[A-Z]/.test(password) && !/[^a-zA-Z0-9]/.test(password)) {
      setPasswordWarning('Use a mix of letters, numbers & symbols');
    } else {
      setPasswordWarning('');
    }
  }, [password]);

  // Field focus states
  const [emailFocused, setEmailFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

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

  const handleRequestOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your registered email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.forgotPasswordRequest(email.trim().toLowerCase());
      if (res.data?.success) {
        Alert.alert(
          'Verification Code Sent',
          res.data.message || 'If registered, a 6-digit OTP code has been sent to your email.'
        );
        setStep('reset');
      } else {
        Alert.alert('Error', res.data?.message || 'Could not send verification code.');
      }
    } catch (err: any) {
      const errorMsg = formatAuthApiError(err);
      Alert.alert('Failed to send OTP', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit verification code.');
      return;
    }
    if (!password) {
      Alert.alert('Missing Password', 'Please enter your new password.');
      return;
    }
    if (password.length < 10) {
      Alert.alert('Weak Password', 'Password must be at least 10 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords mismatch', 'New password and confirm password do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.forgotPasswordReset({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
      });

      if (res.data?.success) {
        Alert.alert(
          'Success',
          res.data.message || 'Your password has been reset successfully. Please log in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert('Error', res.data?.message || 'Password reset failed.');
      }
    } catch (err: any) {
      const errorMsg = formatAuthApiError(err);
      Alert.alert('Reset failed', errorMsg);
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
          {/* Custom Header Nav */}
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              onPress={() => (step === 'reset' ? setStep('request') : navigation.navigate('Login'))}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ChevronLeft size={24} color="#f0f0f0" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Password Recovery</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ height: height * 0.05 }} />

            <View style={styles.cardWrapper}>
              <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.card}>
                <View style={styles.cardContent}>
                  {step === 'request' ? (
                    <>
                      <Text style={styles.welcomeTitle}>Forgot Password?</Text>
                      <Text style={styles.welcomeSub}>
                        Enter your registered email below, and we'll send you a 6-digit OTP code to verify and reset your password.
                      </Text>

                      {/* Email Field */}
                      <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
                        <View style={styles.iconBox}>
                          <Mail size={18} color="#f0f0f0" />
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="Email Address"
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onFocus={() => setEmailFocused(true)}
                          onBlur={() => setEmailFocused(false)}
                          editable={!loading}
                        />
                      </View>

                      {/* Request OTP Button */}
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={handleRequestOtp}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.actionBtnText}>Send Verification Code</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.welcomeTitle}>Reset Password</Text>
                      <Text style={styles.welcomeSub}>
                        We have sent a verification code to <Text style={styles.emailHighlight}>{email}</Text>. Please verify and enter a new password below.
                      </Text>

                      {/* OTP Field */}
                      <View style={[styles.inputContainer, otpFocused && styles.inputContainerFocused]}>
                        <View style={styles.iconBox}>
                          <KeyRound size={18} color="#f0f0f0" />
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="6-Digit Verification Code"
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={otp}
                          onChangeText={setOtp}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoCapitalize="none"
                          onFocus={() => setOtpFocused(true)}
                          onBlur={() => setOtpFocused(false)}
                          editable={!loading}
                        />
                      </View>

                      {/* New Password Field */}
                      <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
                        <View style={styles.iconBox}>
                          <Lock size={18} color="#f0f0f0" />
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="New Password"
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPass}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                          editable={!loading}
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

                      {passwordWarning ? (
                        <Text style={[styles.passwordHint, styles.passwordHintWarning]}>
                          {passwordWarning}
                        </Text>
                      ) : (
                        <Text style={styles.passwordHint}>
                          Min 10 characters · Use a mix of letters, numbers &amp; symbols · Avoid common passwords
                        </Text>
                      )}

                      {/* Confirm Password Field */}
                      <View style={[styles.inputContainer, confirmPasswordFocused && styles.inputContainerFocused]}>
                        <View style={styles.iconBox}>
                          <Lock size={18} color="#f0f0f0" />
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="Confirm New Password"
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showConfirmPass}
                          onFocus={() => setConfirmPasswordFocused(true)}
                          onBlur={() => setConfirmPasswordFocused(false)}
                          editable={!loading}
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirmPass(!showConfirmPass)}
                          style={styles.eyeToggle}
                        >
                          {showConfirmPass ? (
                            <EyeOff size={18} color="#f0f0f0" />
                          ) : (
                            <Eye size={18} color="#f0f0f0" />
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Reset Password Button */}
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={handleResetPassword}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.actionBtnText}>Reset Password</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Return to Login */}
                  <TouchableOpacity
                    style={styles.backToLoginBtn}
                    onPress={() => navigation.navigate('Login')}
                    disabled={loading}
                  >
                    <Text style={styles.backToLoginText}>Back to Sign In</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },
  bgImage: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: Platform.OS === 'ios' ? 90 : 80,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#f0f0f0',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  cardWrapper: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  card: {
    width: width - 40,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(26, 26, 26, 0.4)',
  },
  cardContent: {
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
    fontFamily: 'Inter-ExtraBold',
  },
  welcomeSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  emailHighlight: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#444444',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  inputContainerFocused: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
  },
  iconBox: {
    marginRight: 12,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    color: '#f0f0f0',
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    height: '100%',
    padding: 0,
    outlineStyle: 'none',
  } as any,
  eyeToggle: {
    padding: 8,
  },
  actionBtn: {
    height: 58,
    backgroundColor: '#FF6B00',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  passwordHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'left',
    marginBottom: 20,
    marginTop: -14,
    lineHeight: 16,
    fontFamily: 'Inter-Regular',
  },
  passwordHintWarning: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  backToLoginBtn: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 10,
  },
  backToLoginText: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});
