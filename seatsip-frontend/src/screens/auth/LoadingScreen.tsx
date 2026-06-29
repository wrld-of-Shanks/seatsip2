import React, { useEffect, useRef, useState } from 'react';
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
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuth } from '../../context/AuthContext';

const firstVideo = require('../../../media/first_gwr_video_mvp.mp4');

interface LoadingScreenProps {
  onFinish?: () => void;
}

function VideoPlayerComponent({
  onFinish,
  onError,
}: {
  onFinish: () => void;
  onError: () => void;
}) {
  const { isLoading } = useAuth();
  const videoCompletedRef = useRef(false);
  const [videoCompleted, setVideoCompleted] = useState(false);

  const player = useVideoPlayer(firstVideo, (playerInstance) => {
    playerInstance.loop = false;
    playerInstance.play();
  });

  // Watch for player errors
  useEffect(() => {
    const subscription = player.addListener('statusChange', (event) => {
      const status = typeof event === 'object' && event ? event.status : event;
      if (status === 'error') {
        console.warn('Video playback error, falling back to animated loader:', event);
        onError();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [player, onError]);

  // Handle video ending
  useEventListener(player, 'playToEnd', () => {
    videoCompletedRef.current = true;
    setVideoCompleted(true);
    
    if (!isLoading) {
      onFinish();
    } else {
      // Loop the video if the app is still loading
      player.loop = true;
      player.play();
    }
  });

  // Watch auth loading status: if loading finishes and video has finished at least once, transition out
  useEffect(() => {
    if (!isLoading && videoCompletedRef.current) {
      onFinish();
    }
  }, [isLoading, onFinish]);

  return (
    <VideoView
      style={StyleSheet.absoluteFill}
      player={player}
      contentFit="cover"
      surfaceType="textureView"
      allowsFullscreen={false}
      nativeControls={false}
    />
  );
}

function AnimatedLoadingUI({ onFinish }: { onFinish?: () => void }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(25)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const progressVal = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
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
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
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
            useNativeDriver: false,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(2400),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (onFinish) {
        onFinish();
      }
    });
  }, [logoOpacity, logoScale, textOpacity, textTranslateY, subtitleOpacity, progressOpacity, progressVal, screenOpacity, onFinish]);

  const barWidth = progressVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.overlay}>
        <View style={styles.content}>
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

export default function LoadingScreen({ onFinish }: LoadingScreenProps) {
  // Temporarily bypass the video player and render the animated fallback UI for now.
  // To restore the video player after approval, uncomment the block below and remove this return statement.
  return <AnimatedLoadingUI onFinish={onFinish} />;

  /*
  const [videoError, setVideoError] = useState(false);

  // Fallback safety timeout: if anything hangs, transition in 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (videoError) {
    return <AnimatedLoadingUI onFinish={onFinish} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <VideoPlayerComponent
        onFinish={onFinish || (() => {})}
        onError={() => setVideoError(true)}
      />
    </View>
  );
  */
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
