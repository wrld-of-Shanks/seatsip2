import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageBackground,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Wifi, Battery, Search, Home, QrCode, Gift, User, Lock, Bolt, ArrowRight, Coffee, Info, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../../components/ui/AppIcon';
import { useAuth } from '../../context/AuthContext';
import { rewardsApi } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const REWARDS = [
  {
    id: '1',
    name: 'Free artisan coffee',
    points: 150,
    tier: 'Coffee',
    icon: '',
    category: 'Food & Drink',
    unlocked: true,
  },
  {
    id: '2',
    name: 'Phone-free booth (1 hr)',
    points: 300,
    tier: 'Coffee',
    icon: '',
    category: 'Experience',
    unlocked: true,
  },
  {
    id: '3',
    name: 'Pastry + coffee combo',
    points: 400,
    tier: 'Caramel',
    icon: '',
    category: 'Food & Drink',
    unlocked: false,
  },
  {
    id: '4',
    name: 'Priority window seat',
    points: 500,
    tier: 'Caramel',
    icon: '',
    category: 'Experience',
    unlocked: false,
  },
  {
    id: '5',
    name: 'Detox Day Pass',
    points: 1000,
    tier: 'Cream',
    icon: '',
    category: 'Experience',
    unlocked: false,
  },
  {
    id: '6',
    name: 'Branded journal',
    points: 800,
    tier: 'Cream',
    icon: '',
    category: 'Merch',
    unlocked: false,
  },
  {
    id: '7',
    name: 'Bring a friend free',
    points: 1200,
    tier: 'Cream',
    icon: '',
    category: 'Experience',
    unlocked: false,
  },
  {
    id: '8',
    name: 'Custom drink named after you',
    points: 2000,
    tier: 'Cream',
    icon: '',
    category: 'Food & Drink',
    unlocked: false,
  },
];

const TABS = ['All', 'Food & Drink', 'Experience', 'Merch'];

export default function AllRewardsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('All');

  const points = user?.loyalty_points ?? 340;
  const userTier = user?.loyalty_tier?.toLowerCase() || 'silver';
  const tierDisplay = userTier === 'platinum' ? 'Cream' : userTier === 'gold' ? 'Caramel' : 'Coffee';

  // State
  const [rewardsList, setRewardsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [redemptionError, setRedemptionError] = useState('');
  const [showRedemptionSuccess, setShowRedemptionSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  
  // Selection/Redeem Modals
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Dynamic progress range calculations
  const currentTierMin = userTier === 'platinum' ? 4000 : userTier === 'gold' ? 2000 : 0;
  const nextTierMax = userTier === 'platinum' ? 4000 : userTier === 'gold' ? 4000 : 2000;
  const progressPct = useMemo(() => {
    if (userTier === 'platinum') return 100;
    const range = nextTierMax - currentTierMin;
    const earned = points - currentTierMin;
    return Math.min(100, Math.max(0, (earned / range) * 100));
  }, [points, userTier, currentTierMin, nextTierMax]);

  const getFallbackRewards = useCallback(() => {
    const rankMap: Record<string, number> = { silver: 1, gold: 2, platinum: 3 };
    const userRank = rankMap[userTier] || 1;

    return REWARDS.map(r => {
      const tierReq = r.tier.toLowerCase() === 'coffee' ? 'silver' : r.tier.toLowerCase() === 'caramel' ? 'gold' : 'platinum';
      const reqRank = rankMap[tierReq] || 1;
      const canAccess = userRank >= reqRank;
      const canRedeem = canAccess && points >= r.points;
      
      return {
        id: r.id,
        name: r.name,
        points_cost: r.points,
        tier_required: tierReq.toUpperCase(),
        category: r.category,
        icon: r.icon,
        canAccess,
        canRedeem,
        pointsShortfall: Math.max(0, r.points - points),
      };
    });
  }, [userTier, points]);

  const fetchRewards = useCallback(() => {
    setLoading(true);
    setApiError('');
    rewardsApi.list()
      .then((res) => {
        if (res.data?.success) {
          setRewardsList(res.data.rewards || []);
        } else {
          setApiError('Failed to load rewards');
          setRewardsList(getFallbackRewards());
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching rewards:', err);
        setApiError('Error connecting to rewards service');
        setRewardsList(getFallbackRewards());
        setLoading(false);
      });
  }, [getFallbackRewards]);

  useEffect(() => {
    refreshUser();
    fetchRewards();
  }, [refreshUser, fetchRewards]);

  const handleRewardPress = (reward: any) => {
    if (!reward.canAccess) {
      const reqTierDisplay = reward.tier_required === 'SILVER' ? 'Coffee' : reward.tier_required === 'GOLD' ? 'Caramel' : 'Cream';
      Alert.alert(
        'Tier Locked',
        `This reward requires the premium ${reqTierDisplay} membership tier. Purchase/Upgrade your tier on the Rewards page.`
      );
      return;
    }
    if (!reward.canRedeem) {
      Alert.alert(
        'Insufficient Points',
        `You need ${reward.pointsShortfall} more points to redeem this reward. Keep visiting and ordering to earn more points!`
      );
      return;
    }
    
    setSelectedReward(reward);
    setShowConfirmModal(true);
    setRedemptionError('');
  };

  const confirmRedemption = async () => {
    if (!selectedReward) return;
    
    setIsRedeeming(true);
    setRedemptionError('');
    
    try {
      const res = await rewardsApi.redeem(selectedReward.id);
      if (res.data?.success) {
        setSuccessMsg(res.data?.message || `Successfully redeemed ${selectedReward.name}!`);
        setShowConfirmModal(false);
        setSelectedReward(null);
        setShowRedemptionSuccess(true);
        
        refreshUser();
        fetchRewards();
      } else {
        setRedemptionError(res.data?.message || 'Redemption failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Error redeeming reward:', err);
      setRedemptionError(err.response?.data?.message || err.message || 'Redemption request failed');
    } finally {
      setIsRedeeming(false);
    }
  };

  const filteredRewards = rewardsList.filter(r => activeTab === 'All' || r.category === activeTab);

  const silverRewards = filteredRewards.filter(r => r.tier_required === 'SILVER');
  const goldRewards = filteredRewards.filter(r => r.tier_required === 'GOLD');
  const platinumRewards = filteredRewards.filter(r => r.tier_required === 'PLATINUM');

  const renderRewardCard = (reward: any) => {
    const isUnlocked = reward.canAccess;
    const isRedeemable = reward.canRedeem;
    const reqTierDisplay = reward.tier_required === 'SILVER' ? 'Coffee' : reward.tier_required === 'GOLD' ? 'Caramel' : 'Cream';
    
    return (
      <TouchableOpacity 
        key={reward.id} 
        style={[styles.rewardCard, !isUnlocked && styles.rewardCardLocked]}
        activeOpacity={isUnlocked ? 0.8 : 1}
        onPress={() => handleRewardPress(reward)}
      >
        {!isUnlocked && (
          <View style={styles.lockOverlay}>
            <AppIcon name="lock" size={14} color="#999" />
          </View>
        )}
        <Text style={styles.rewardIcon}>{reward.icon || '🎁'}</Text>
        <Text style={styles.rewardName} numberOfLines={2}>{reward.name}</Text>
        <View style={styles.rewardMeta}>
          <Text style={[styles.pointsCost, !isRedeemable && isUnlocked && { color: '#888' }]}>
            {reward.points_cost} pts
          </Text>
          <View style={[
            styles.tierTag, 
            reward.tier_required === 'SILVER' ? styles.tagCoffee : reward.tier_required === 'GOLD' ? styles.tagCaramel : styles.tagCream
          ]}>
            <Text style={styles.tierTagText}>{reqTierDisplay}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/app_bg.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Rewards</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Points Banner */}
          <View style={styles.pointsBanner}>
            <View style={styles.pointsLeft}>
              <Text style={styles.balanceLabel}>Your Balance</Text>
              <View style={styles.pointsValueRow}>
                <Text style={styles.pointsValue}>{points}</Text>
                <Text style={styles.pointsUnit}> pts</Text>
              </View>
            </View>
            <View style={styles.tierBadge}>
              <View style={[
                styles.tierPill,
                userTier === 'silver' ? styles.tagCoffee : userTier === 'gold' ? styles.tagCaramel : styles.tagCream
              ]}>
                <Text style={styles.tierPillText}>{tierDisplay}</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
              <View style={styles.progressEndLabels}>
                <Text style={styles.progressEndLabel}>{currentTierMin}</Text>
                <Text style={styles.progressEndLabel}>{userTier === 'platinum' ? 'Max' : nextTierMax}</Text>
              </View>
            </View>
          </View>

          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.tabsContainer}
            contentContainerStyle={styles.tabsContent}
          >
            {TABS.map(tab => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tab, activeTab === tab ? styles.tabActive : styles.tabInactive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab ? styles.tabTextActive : styles.tabTextInactive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#6D3914" />
              <Text style={{ marginTop: 12, color: '#6D3914', fontWeight: '600' }}>Loading rewards...</Text>
            </View>
          ) : (
            <>
              {/* Silver Section */}
              {silverRewards.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Unlocked · Coffee</Text>
                  <View style={styles.rewardGrid}>
                    {silverRewards.map(renderRewardCard)}
                  </View>
                </>
              )}

              {/* Gold Section */}
              {goldRewards.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Caramel Tier Required</Text>
                  <View style={styles.rewardGrid}>
                    {goldRewards.map(renderRewardCard)}
                  </View>
                </>
              )}

              {/* Platinum Section */}
              {platinumRewards.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Cream Tier Required</Text>
                  <View style={styles.rewardGrid}>
                    {platinumRewards.map(renderRewardCard)}
                  </View>
                </>
              )}
            </>
          )}

          {/* Bottom CTA */}
          <TouchableOpacity 
            style={styles.bottomCta} 
            activeOpacity={0.9}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.ctaIconBox}>
              <Zap size={18} color="#B8860B" fill="#B8860B" />
            </View>
            <View style={styles.ctaTextBox}>
              <Text style={styles.ctaTitle}>Upgrade Your Tier</Text>
              <Text style={styles.ctaSub}>Purchase premium tiers to unlock higher tier rewards instantly</Text>
            </View>
            <ArrowRight size={20} color="#999" />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── Redemption Confirmation Modal ── */}
        <Modal
          visible={showConfirmModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.card}>
              <Text style={modalStyles.title}>Redeem Reward?</Text>
              {selectedReward && (
                <>
                  <Text style={modalStyles.rewardNameLabel}>{selectedReward.name}</Text>
                  <Text style={modalStyles.pointsCostLabel}>Cost: {selectedReward.points_cost} points</Text>
                </>
              )}
              {redemptionError ? (
                <Text style={modalStyles.errorMsg}>{redemptionError}</Text>
              ) : null}
              <View style={modalStyles.btnRow}>
                <TouchableOpacity
                  style={[modalStyles.dialogBtn, modalStyles.cancelBtn]}
                  onPress={() => setShowConfirmModal(false)}
                  disabled={isRedeeming}
                >
                  <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.dialogBtn, modalStyles.confirmBtn]}
                  onPress={confirmRedemption}
                  disabled={isRedeeming}
                >
                  {isRedeeming ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={modalStyles.confirmBtnText}>Redeem</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Redemption Success Modal ── */}
        <Modal
          visible={showRedemptionSuccess}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRedemptionSuccess(false)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.card}>
              <View style={modalStyles.successBadge}>
                <AppIcon name="check" size={32} color="#FFF" />
              </View>
              <Text style={modalStyles.title}>Redeemed!</Text>
              <Text style={modalStyles.subtitle}>{successMsg}</Text>
              <TouchableOpacity
                style={modalStyles.successBtn}
                onPress={() => setShowRedemptionSuccess(false)}
              >
                <Text style={modalStyles.successBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  safeArea: { flex: 1, width: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
  },
  pointsBanner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pointsLeft: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  pointsValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
  },
  pointsUnit: {
    fontSize: 18,
    color: '#B8934A',
    fontWeight: '700',
  },
  _rupeeValue_removed: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  tierBadge: {
    alignItems: 'flex-end',
    width: 130,
  },
  tierPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  tierPillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressEndLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  progressEndLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#B8934A',
    borderRadius: 2,
  },
  tabsContainer: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  tabInactive: {
    backgroundColor: '#FFF',
    borderColor: '#EEE',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
  },
  tabTextInactive: {
    color: '#666',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  rewardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  rewardCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  rewardCardLocked: {
    backgroundColor: '#F9F9F9',
    opacity: 0.8,
  },
  lockOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  rewardIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  rewardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 18,
    marginBottom: 12,
    height: 36,
  },
  rewardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsCost: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B8860B',
  },
  tierTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagCoffee: {
    backgroundColor: '#3F1D0E',
  },
  tagCaramel: {
    backgroundColor: '#A2663C',
  },
  tagCream: {
    backgroundColor: '#E4CDB0',
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  bottomCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF3E8',
    padding: 16,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F0EBE3',
  },
  ctaIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ctaTextBox: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  ctaSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(57, 29, 14, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FAF3E8',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3F1D0E',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6D3914',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  rewardNameLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6D3914',
    textAlign: 'center',
    marginBottom: 6,
  },
  pointsCostLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B8860B',
    marginBottom: 20,
  },
  errorMsg: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E4CDB0',
  },
  cancelBtnText: {
    color: '#6D3914',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmBtn: {
    backgroundColor: '#6D3914',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  successBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successBtn: {
    backgroundColor: '#6D3914',
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  successBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
