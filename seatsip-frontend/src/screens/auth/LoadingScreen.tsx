import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function LoadingScreen() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(25)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const progressVal = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Run the animation sequence
    Animated.parallel([
      // 1. Logo Animation (fades in and scales up after 200ms delay)
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // 2. Text Animation (slides up and fades in after 600ms delay)
      Animated.sequence([
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // 3. Subtitle Animation (fades in after 900ms delay)
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // 4. Progress bar & loader fade in, and fill bar over 1.2s (after 1100ms delay)
      Animated.sequence([
        Animated.delay(1100),
        Animated.parallel([
          Animated.timing(progressOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(progressVal, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false, // layout property (width) doesn't support native driver
          }),
        ]),
      ]),
      // 5. Final screen cross-fade to home screen (at 2400ms)
      Animated.sequence([
        Animated.delay(2400),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const barWidth = progressVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Animated Logo Image */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('../../../assets/adaptive-icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Animated Branding Text */}
          <Animated.View
            style={[
              styles.branding,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            <Text style={styles.logoText}>
              SEAT<Text style={{ color: '#D4A373' }}>SIP</Text>
            </Text>
            <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
              CRAFTING YOUR EXPERIENCE
            </Animated.Text>
          </Animated.View>

          {/* Animated Loading Progress Bar */}
          <Animated.View style={[styles.loaderWrapper, { opacity: progressOpacity }]}>
            <BlurView intensity={20} tint="light" style={styles.loaderTrack}>
              <Animated.View style={[styles.loaderBar, { width: barWidth }]} />
            </BlurView>
            <Text style={styles.loadingText}>Preparing your table...</Text>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1008', // Premium dark coffee color matching app.json splash background
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderRadius: 65,
    backgroundColor: '#E6DDD4', // Warm beige background to contrast with the dark/caramel logo foreground
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    padding: 15,
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#E6DDD4', // Warm beige color for branding
    letterSpacing: 10,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(230, 221, 212, 0.6)', // Muted warm beige
    letterSpacing: 4,
    marginTop: 10,
    fontWeight: '600',
  },
  loaderWrapper: {
    width: '100%',
    maxWidth: 240,
    alignItems: 'center',
  },
  loaderTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(230, 221, 212, 0.1)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(230, 221, 212, 0.15)',
  },
  loaderBar: {
    height: '100%',
    backgroundColor: '#D4A373', // Caramel accent color matching the design system
    borderRadius: 3,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 13,
    color: 'rgba(230, 221, 212, 0.7)',
    fontWeight: '500',
    letterSpacing: 1,
  },
});
