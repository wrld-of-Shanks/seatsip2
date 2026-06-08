import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { cafesApi } from '../../services/api';
import AppIcon from '../../components/ui/AppIcon';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 320;

function parseJsonArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function galleryFromCafe(cafe: any): string[] {
  if (!cafe) return [];
  const fromField = parseJsonArray(cafe.images);
  if (fromField.length) return fromField;
  if (cafe.image_url) return [cafe.image_url];
  return [];
}

type CafeDetailRouteProp = RouteProp<RootStackParamList, 'CafeDetail'>;

const MOOD_STYLES: Record<string, { icon: string; bgColor: string; textColor: string }> = {
  work: { icon: 'work', bgColor: '#FFCCAA', textColor: '#C87941' },
  laptop: { icon: 'work', bgColor: '#FFCCAA', textColor: '#C87941' },
  study: { icon: 'work', bgColor: '#FFCCAA', textColor: '#C87941' },
  date: { icon: 'date', bgColor: '#D0C5FF', textColor: '#7B5FD4' },
  romance: { icon: 'date', bgColor: '#D0C5FF', textColor: '#7B5FD4' },
  romantic: { icon: 'date', bgColor: '#D0C5FF', textColor: '#7B5FD4' },
  chill: { icon: 'vegan', bgColor: '#BAEBC3', textColor: '#2E7D45' },
  relax: { icon: 'vegan', bgColor: '#BAEBC3', textColor: '#2E7D45' },
  relaxed: { icon: 'vegan', bgColor: '#BAEBC3', textColor: '#2E7D45' },
  social: { icon: 'users', bgColor: '#FFF2C5', textColor: '#E5A900' },
  group: { icon: 'users', bgColor: '#FFF2C5', textColor: '#E5A900' },
  groups: { icon: 'users', bgColor: '#FFF2C5', textColor: '#E5A900' },
  friends: { icon: 'users', bgColor: '#FFF2C5', textColor: '#E5A900' },
  meeting: { icon: 'users', bgColor: '#FFF2C5', textColor: '#E5A900' },
  coffee: { icon: 'coffee', bgColor: '#F0E6DF', textColor: '#8B5E3C' },
  brew: { icon: 'coffee', bgColor: '#F0E6DF', textColor: '#8B5E3C' },
};

function getMoodStyle(mood: string) {
  const normalized = mood.toLowerCase().trim();
  if (MOOD_STYLES[normalized]) {
    return MOOD_STYLES[normalized];
  }
  return { icon: 'popular', bgColor: '#EAD7C3', textColor: '#8B5E3C' };
}

const DyuArtCafeScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<CafeDetailRouteProp>();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [cafe, setCafe] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const cafeId = route.params?.cafeId || '';
  const gallery = galleryFromCafe(cafe);
  const cafeName = cafe?.name || 'Café';
  const rawMoods = parseJsonArray(cafe?.moods);
  const moods = rawMoods.length > 0 ? rawMoods : ['Work', 'Date', 'Chill'];
  const rawTags = parseJsonArray(cafe?.tags);
  const tags = rawTags.length > 0 ? rawTags : ['Art space', 'Board games', 'Vegan options', 'Instagrammable'];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const [{ data: cafeRes }, { data: revRes }] = await Promise.all([
        cafesApi.getById(cafeId),
        cafesApi.getReviews(cafeId, { limit: 4 }),
      ]);
      if (cafeRes.success) setCafe(cafeRes.data);
      else setLoadError(true);
      if (revRes.success && Array.isArray(revRes.data)) setReviews(revRes.data);
      else setReviews([]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    if (!cafeId) {
      setLoading(false);
      setLoadError(true);
      return;
    }
    loadData();
  }, [loadData]);

  const handleSubmitReview = async () => {
    if (reviewRating < 1 || reviewRating > 5) {
      Alert.alert('Invalid Rating', 'Please select a rating between 1 and 5 stars.');
      return;
    }
    try {
      setSubmittingReview(true);
      await cafesApi.postReview(cafeId, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewModalVisible(false);
      setReviewComment('');
      setReviewRating(5);
      Alert.alert('Review Submitted', 'Thank you for your feedback!');
      loadData(); // Reload reviews
    } catch (err: any) {
      console.error('Review error:', err?.response?.data || err.message);
      Alert.alert('Error', err?.response?.data?.message || 'Could not submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddPhoto = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your camera to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        // In a real app, we'd upload to S3/Cloudinary first.
        // For this demo, we'll send a high-quality Unsplash image as a placeholder for the upload.
        const demoUrl = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';
        
        await cafesApi.addImage(cafeId, demoUrl);
        Alert.alert('Success', 'Photo added to gallery!');
        loadData(); // Refresh local data
        // Navigate to the gallery screen to show the new content
        navigation.navigate('CafeGallery', { cafeId, cafeName });
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  };

  const handleReserve = () => {
    const id = cafe?.id || cafeId;
    navigation.navigate('TableSelect', { cafeId: id, cafeName });
  };

  const handleOrder = () => {
    const id = cafe?.id || cafeId;
    navigation.navigate('Menu', { cafeId: id, cafeName });
  };

  // Auto-play logic
  useEffect(() => {
    if (gallery.length <= 1) return;
    const timer = setInterval(() => {
      const nextIndex = (activeImageIndex + 1) % gallery.length;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    }, 4000);
    return () => clearInterval(timer);
  }, [activeImageIndex, gallery.length]);

  // Parallax Effect for the Carousel
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, HEADER_HEIGHT * 0.5], // Moves slower than scroll to create overlap
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: 'clamp',
  });

  // if (loading) {
  //   return (
  //     <View style={[styles.container, styles.centered]}>
  //       <ActivityIndicator size="large" color="#7A5240" />
  //     </View>
  //   );
  // }

  if (loadError || !cafe) {
    return (
      <View style={[styles.container, styles.centered, { padding: 24 }]}>
        <Text style={styles.errorTitle}>We could not load this café.</Text>
        <TouchableOpacity style={styles.errorBack} onPress={() => navigation.goBack()}>
          <Text style={styles.errorBackText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const slides = gallery.length ? gallery : [cafe.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800'];
  const ratingVal = Number(cafe.rating) || 0;
  const reviewCount = cafe.review_count ?? 0;
  const hoursLabel = [cafe.open_time, cafe.close_time].filter(Boolean).join(' – ') || 'Hours on request';
  const addressText = [cafe.address, cafe.city].filter(Boolean).join(', ') || '';

  return (
    <View style={styles.container}>
      {/* 1. Fixed Top Bar (Back & Camera buttons) */}
      <View style={[styles.staticOverlay, { pointerEvents: 'box-none' }]}>
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => navigation.goBack()}
          >
            <AppIcon name="back" size={22} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleAddPhoto}
          >
            <View style={styles.iconButtonRow}>
              <AppIcon name="camera" size={20} color="#111" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Scrollable Content */}
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Carousel with Parallax */}
        <Animated.View 
          style={{ 
            height: HEADER_HEIGHT,
            transform: [{ translateY: headerTranslate }, { scale: headerScale }] 
          }}
        >
          <ScrollView 
            ref={scrollRef}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / width);
              if (index !== activeImageIndex) setActiveImageIndex(index);
            }}
          >
            {slides.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={{ width: width, height: HEADER_HEIGHT }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Badges and Pagination - Inside the carousel layer so they go behind content */}
          <View style={[styles.carouselOverlay, { pointerEvents: 'none' }]}>
            <View style={styles.badgesContainer}>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: Number(cafe.is_open) === 1 ? '#4CAF50' : '#999' }]} />
                <Text style={[styles.statusText, { color: Number(cafe.is_open) === 1 ? '#4CAF50' : '#666' }]}>
                  {Number(cafe.is_open) === 1 ? 'Open now' : 'Closed'}
                </Text>
              </View>
              <View style={styles.timeBadge}>
                <View style={styles.timeBadgeRow}><AppIcon name="time" size={12} color="#fff" /><Text style={styles.timeText}>{hoursLabel}</Text></View>
              </View>
            </View>
            <View style={styles.pagination}>
              {slides.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.dot, 
                    activeImageIndex === i && styles.activeDot
                  ]} 
                />
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Details Container - Overlaps Carousel on Scroll */}
        <View style={styles.detailsContainer}>
          {/* 1. Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{cafeName}</Text>
            <View style={styles.specialtyBadge}>
              <Text style={styles.specialtyText}>🌿 Specialty</Text>
            </View>
          </View>

          {/* 2. Rating Row */}
          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4].map(i => <AppIcon key={i} name="popular" size={15} color="#F4A300" fill="#F4A300" />)}
              <AppIcon name="popular" size={15} color="#F4A300" fill="none" />
            </View>
            <Text style={styles.ratingScore}>{ratingVal.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({reviewCount} reviews)</Text>
          </View>

          {/* 3. Address Card */}
          <View style={styles.addressCard}>
            <View style={styles.addressInfo}>
              <View style={styles.addressRow}>
                <AppIcon name="location" size={16} color="#C8382A" />
                <Text style={styles.addressText}>{addressText || 'Address not available'}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  navigation.navigate('MainTabs', {
                    screen: 'MapScreen',
                    params: { 
                      cafeId: cafe.id,
                      latitude: cafe.latitude,
                      longitude: cafe.longitude,
                      name: cafe.name
                    }
                  });
                }}
              >
                <Text style={styles.mapLinkBtn}>View on map ↗</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.miniGallery}>
              <Image source={{ uri: slides[0] }} style={styles.miniImg} />
              <View style={styles.photoCountOverlay}>
                <Text style={styles.photoCountText}>{slides.length}+ Photos</Text>
              </View>
            </View>
          </View>

          {/* 4. Quick Stats Pills */}
          <View style={styles.quickStatsRow}>
            <View style={styles.statPill}>
              <AppIcon name="wifi" size={16} color="#888" />
              <Text style={styles.statPillText}>Free Wi-Fi</Text>
            </View>
            <View style={styles.statPill}>
              <AppIcon name="time" size={16} color="#888" />
              <Text style={styles.statPillText}>{cafe.prep_time_minutes || 10} min prep</Text>
            </View>
            <View style={styles.statPill}>
              <AppIcon name="coffee" size={16} color="#888" />
              <Text style={styles.statPillText}>Spec. Beans</Text>
            </View>
          </View>

          {/* 5. About Section */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitleAbout}>About {cafeName}</Text>
          <View style={styles.aboutRow}>
            <View style={styles.aboutIconCircle}>
              <AppIcon name="coffee" size={20} color="#8B5E3C" />
            </View>
            <View style={styles.aboutContentRight}>
              <Text style={styles.aboutBodyText}>
                {cafe.description?.trim() || 'Specialty coffee roasters serving single-origin brews in a modern industrial space.'}
              </Text>
            </View>
          </View>

          {/* 6. Perfect For Section */}
          <View style={styles.sectionHeaderCompact}>
            <Text style={styles.sectionTitleEmoji}>✨</Text>
            <Text style={styles.sectionTitleMain}>Perfect for</Text>
          </View>
          <View style={styles.perfectForRow}>
            {moods.map((mood) => {
              const style = getMoodStyle(mood);
              return (
                <View key={mood} style={[styles.perfectCard, { backgroundColor: style.bgColor }]}>
                  <AppIcon name={style.icon} size={20} color={style.textColor} />
                  <Text style={[styles.perfectText, { color: style.textColor }]}>{mood}</Text>
                </View>
              );
            })}
          </View>

          {/* 7. More Reasons (Tags) */}
          <View style={styles.moreReasonsHeader}>
            <AppIcon name="date" size={15} color="#888" />
            <Text style={styles.moreReasonsTitle}>More reasons to love it</Text>
          </View>
          <View style={styles.tagsContainer}>
            {tags.map(tag => (
              <View key={tag} style={styles.outlineTag}>
                <AppIcon name="popular" size={12} color="#888" />
                <Text style={styles.outlineTagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* 8. Reviews Section */}
          <View style={styles.divider} />
          <View style={styles.reviewsHeaderRow}>
            <Text style={styles.sectionTitleMain}>Reviews</Text>
            <View style={styles.reviewsActionRow}>
              <TouchableOpacity onPress={() => setReviewModalVisible(true)} style={styles.writeReviewBtn}>
                <Text style={styles.writeReviewBtnText}>Write a review</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.seeAllBtn}>See all ↗</Text>
              </TouchableOpacity>
            </View>
          </View>

          {reviews.length === 0 ? (
            <Text style={styles.emptyReviewsText}>No reviews yet. Be the first after your visit.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.newReviewCard}>
                <View style={styles.reviewTopRow}>
                  <View style={[styles.newAvatar, { backgroundColor: r.user_name?.startsWith('P') ? '#D4537E' : '#534AB7' }]}>
                    <Text style={styles.newAvatarText}>{(r.user_name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.newReviewerName}>{r.user_name || 'Guest'}</Text>
                    <Text style={styles.newReviewDate}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  <Text style={styles.newReviewStars}>{Number(r.rating).toFixed(1)} ★</Text>
                </View>
                <Text style={styles.newReviewBody}>{r.comment}</Text>
              </View>
            ))
          )}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.btnOutline} onPress={handleReserve}>
          <View style={styles.actionBtnContent}><AppIcon name="reservation" size={16} color="#6B3F1F" /><Text style={styles.btnOutlineText}>Reserve Table</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSolid} onPress={handleOrder}>
          <View style={styles.actionBtnContent}><AppIcon name="coffee" size={16} color="#fff" /><Text style={styles.btnSolidText}>Order Now</Text></View>
        </TouchableOpacity>
      </View>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.reviewModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <AppIcon name="back" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.ratingLabel}>Rate your experience</Text>
            <View style={styles.modalStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  activeOpacity={0.7}
                >
                  <AppIcon
                    name="star"
                    size={32}
                    color={star <= reviewRating ? '#FFD700' : '#E0E0E0'}
                    fill={star <= reviewRating ? '#FFD700' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Share your thoughts about this cafe..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <TouchableOpacity 
              style={[styles.submitReviewBtn, submittingReview && styles.disabledBtn]}
              onPress={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitReviewBtnText}>Post Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBack: {
    backgroundColor: '#7A5240',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBackText: {
    color: '#fff',
    fontWeight: '700',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 0,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  staticOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 10,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'flex-end', // Position dots at bottom
    paddingBottom: 20,
  },
  iconButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgesContainer: {
    alignItems: 'flex-start',
    gap: 8,
  },
  statusBadge: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 13,
  },
  timeBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  timeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerSpacer: {
    height: HEADER_HEIGHT - 30, // 30px overlap from detailsContainer
    backgroundColor: 'transparent',
  },
  detailsContainer: {
    backgroundColor: '#FAF3E8',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    minHeight: height,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Courgette_400Regular',
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 34,
  },
  specialtyBadge: {
    backgroundColor: '#EAF7EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  specialtyText: {
    color: '#2E7D45',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  starsRow: { flexDirection: 'row', gap: 2 },
  ratingScore: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  reviewCount: { fontSize: 13, color: '#666' },

  // Address Card
  addressCard: {
    backgroundColor: '#F9F5F0',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  addressInfo: { flex: 1 },
  addressRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  addressText: { fontSize: 13, color: '#1A1A1A', lineHeight: 19 },
  mapLinkBtn: { fontSize: 13, fontWeight: '700', color: '#8B5E3C', marginLeft: 24 },
  miniGallery: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF',
    position: 'relative',
  },
  miniImg: { width: '100%', height: '100%' },
  photoCountOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  photoCountText: { color: '#FFF', fontSize: 10, fontWeight: '600' },

  // Quick Stats
  quickStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statPillText: { fontSize: 12, color: '#555' },

  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 18 },
  
  // About
  sectionTitleAbout: {
    fontSize: 17,
    fontFamily: 'Courgette_400Regular',
    fontWeight: '700',
    color: '#8B5E3C',
    marginBottom: 12,
  },
  aboutRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  aboutIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F9F0E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutContentRight: { flex: 1 },
  aboutBodyText: { fontSize: 13, color: '#666', lineHeight: 21, marginBottom: 8 },
  aboutImgRow: { flexDirection: 'row', gap: 8 },
  aboutSmallImg: { width: 72, height: 56, borderRadius: 8 },

  // Perfect For
  sectionHeaderCompact: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitleEmoji: { fontSize: 17 },
  sectionTitleMain: { fontSize: 17, fontFamily: 'Courgette_400Regular', fontWeight: '700', color: '#1A1A1A' },
  perfectForRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  perfectCard: { flexGrow: 1, minWidth: 80, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  perfectText: { fontSize: 13, fontWeight: '700', marginTop: 4 },

  // More Reasons
  moreReasonsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  moreReasonsTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  outlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 0.5,
    borderColor: '#DDD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  outlineTagText: { fontSize: 12, color: '#555' },

  // Reviews
  reviewsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAllBtn: { fontSize: 13, fontWeight: '700', color: '#8B5E3C' },
  newReviewCard: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  reviewTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  newAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  reviewMeta: { flex: 1 },
  newReviewerName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  newReviewDate: { fontSize: 11, color: '#999' },
  newReviewStars: { fontSize: 14, fontWeight: '700', color: '#F4A300' },
  newReviewBody: { fontSize: 13, color: '#666', lineHeight: 21 },
  emptyReviewsText: { fontSize: 13, color: '#888', textAlign: 'center' },
  
  // Review Actions
  reviewsActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  writeReviewBtn: {
    backgroundColor: '#F9F0E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DDD0',
  },
  writeReviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5E3C',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reviewModalContent: {
    backgroundColor: '#FAF6F1',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  reviewInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E8DDD0',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    fontSize: 14,
    color: '#1A1A1A',
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  submitReviewBtn: {
    backgroundColor: '#6B3F1F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6B3F1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitReviewBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF3E8',
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  btnOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#6B3F1F',
    borderRadius: 12,
    paddingVertical: 14,
    marginRight: 12,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#6B3F1F',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSolid: {
    flex: 1,
    backgroundColor: '#6B3F1F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSolidText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  actionBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});

export default DyuArtCafeScreen;
