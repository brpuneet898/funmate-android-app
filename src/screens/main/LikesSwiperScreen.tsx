/**
 * LIKES SWIPER SCREEN
 * 
 * Full-screen swiping interface for "Who Liked You" profiles.
 * - Clicked user appears at top of stack
 * - Remaining likers sorted by match score descending
 * - Reuses CardSwiper component from SwipeHub
 * - Real-time refill from useLikers hook
 * - Radiant Pulse animation on mutual match
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import CardSwiper from '../../components/CardSwiper';
import MatchAnimation from '../../components/MatchAnimation'; // Radiant Pulse animation
import { Liker } from '../../types/database';
import { calculateProfileCompleteness } from '../../utils/profileCompleteness';
import { useLikers } from '../../hooks/useLikers';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = height * 0.65;

type LikesSwiperRouteParams = {
  LikesSwiper: {
    clickedUserId: string;
  };
};

// Match data for animation
interface MatchData {
  matchId: string;
  chatId: string;
  matchedUser: Liker;
}

const LikesSwiperScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LikesSwiperRouteParams, 'LikesSwiper'>>();
  const { clickedUserId } = route.params;

  const userId = auth().currentUser?.uid;
  const scrollViewRef = useRef<ScrollView>(null);
  const cardSwiperKey = useRef(0);

  // Use the likers hook for real-time updates
  const {
    likers,
    loading,
    hasMore,
    refillQueue,
    markAsActedOn,
  } = useLikers();

  // State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Match animation state
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const showMatchAnimationRef = useRef(false); // Ref for synchronous access in callbacks
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string>('');

  /**
   * Fetch current user's photo for the animation
   */
  useEffect(() => {
    const fetchCurrentUserPhoto = async () => {
      if (!userId) return;
      
      try {
        const userDoc = await firestore().collection('users').doc(userId).get();
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const photos = userData?.photos || [];
          const primaryPhoto = photos.find((p: any) => p.isPrimary) || photos[0];
          if (primaryPhoto?.url) {
            setCurrentUserPhoto(primaryPhoto.url);
          }
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
      }
    };

    fetchCurrentUserPhoto();
  }, [userId]);

  /**
   * Re-order likers: clicked user at top, rest sorted by match score
   * Filter out already swiped cards
   */
  const orderedLikers = useMemo(() => {
    // Filter out swiped likers
    const availableLikers = likers.filter(l => !swipedIds.has(l.swipeId));
    
    // Find the clicked user
    const clickedUser = availableLikers.find(l => l.id === clickedUserId);
    
    // Get remaining users sorted by match score
    const remaining = availableLikers
      .filter(l => l.id !== clickedUserId)
      .sort((a, b) => b.matchScore - a.matchScore);

    // Clicked user at top (if not already swiped)
    if (clickedUser) {
      return [clickedUser, ...remaining];
    }
    return remaining;
  }, [likers, clickedUserId, swipedIds]);

  // Get current liker for detail view
  const currentLiker = currentCardIndex < orderedLikers.length 
    ? orderedLikers[currentCardIndex] 
    : undefined;

  /**
   * Trigger refill when running low on cards
   */
  useEffect(() => {
    const remainingCards = orderedLikers.length - currentCardIndex;
    if (remainingCards <= 5 && hasMore && !loading) {
      refillQueue();
    }
  }, [currentCardIndex, orderedLikers.length, hasMore, loading, refillQueue]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  /**
   * Handle card tap for photo navigation
   */
  const handleCardTap = useCallback((side: 'left' | 'right') => {
    if (!currentLiker || !currentLiker.photos.length) return;

    if (side === 'right') {
      setCurrentPhotoIndex((prev) =>
        prev < currentLiker.photos.length - 1 ? prev + 1 : 0
      );
    } else {
      setCurrentPhotoIndex((prev) =>
        prev > 0 ? prev - 1 : currentLiker.photos.length - 1
      );
    }
  }, [currentLiker]);

  /**
   * Handle swipe right (like) - Creates mutual match!
   */
  const handleSwipeRight = useCallback(async (cardIndex: number) => {
    const liker = orderedLikers[cardIndex];
    if (!liker || !userId || isProcessing) return;

    // Set ref IMMEDIATELY before any async work - this tells handleSwipedAll not to navigate
    // Every swipe right in "Who Liked You" creates a match, so animation will show
    showMatchAnimationRef.current = true;

    setIsProcessing(true);

    try {
      // Mark as swiped locally first for immediate UI update
      setSwipedIds(prev => new Set(prev).add(liker.swipeId));

      // Mark the swipe as acted on in Firestore
      await firestore()
        .collection('swipes')
        .doc(liker.swipeId)
        .update({ actedOnByTarget: true });

      // Create a swipe record (current user liking back)
      await firestore().collection('swipes').add({
        fromUserId: userId,
        toUserId: liker.id,
        action: 'like',
        actedOnByTarget: true, // Already acted on since they liked us first
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create a match document (mutual match!)
      const matchRef = await firestore().collection('matches').add({
        userA: userId,
        userB: liker.id,
        isActive: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create a chat for the match with isMutual: true
      const chatRef = await firestore().collection('chats').add({
        type: 'dating',
        participants: [userId, liker.id],
        relatedMatchId: matchRef.id,
        isMutual: true,
        lastMessage: null,
        relatedEventId: null,
        deletionPolicy: {
          type: 'on_unmatch',
          days: null,
        },
        allowDeleteForEveryone: false,
        deleteForEveryoneWindowDays: null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastMessageAt: firestore.FieldValue.serverTimestamp(),
      });

      // Mark as acted on in the hook for proper tracking
      markAsActedOn(liker.swipeId);

      console.log(`💕 It's a Match with ${liker.name}!`);
      
      // Store match data and show the Radiant Pulse animation
      setMatchData({
        matchId: matchRef.id,
        chatId: chatRef.id,
        matchedUser: liker,
      });
      // Ref already set at start of function
      setShowMatchAnimation(true);

      // Force re-render of CardSwiper with new key
      cardSwiperKey.current += 1;
      
      // Reset for next card
      setCurrentCardIndex(0);
      setCurrentPhotoIndex(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

    } catch (error) {
      console.error('Error creating match:', error);
      // Reset ref on error - no animation will show
      showMatchAnimationRef.current = false;
      // Rollback local state on error
      setSwipedIds(prev => {
        const next = new Set(prev);
        next.delete(liker.swipeId);
        return next;
      });
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create match. Please try again.',
        visibilityTime: 2000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [orderedLikers, userId, isProcessing, markAsActedOn]);

  /**
   * Handle swipe left (pass)
   */
  const handleSwipeLeft = useCallback(async (cardIndex: number) => {
    const liker = orderedLikers[cardIndex];
    if (!liker || !userId || isProcessing) return;

    setIsProcessing(true);

    try {
      // Mark as swiped locally first for immediate UI update
      setSwipedIds(prev => new Set(prev).add(liker.swipeId));

      // Mark the swipe as acted on (passed)
      await firestore()
        .collection('swipes')
        .doc(liker.swipeId)
        .update({ actedOnByTarget: true });

      // Create a pass swipe record
      await firestore().collection('swipes').add({
        fromUserId: userId,
        toUserId: liker.id,
        action: 'pass',
        actedOnByTarget: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Mark as acted on in the hook for proper tracking
      markAsActedOn(liker.swipeId);

      console.log(`❌ Passed: ${liker.name}`);

      // Force re-render of CardSwiper with new key
      cardSwiperKey.current += 1;
      
      // Reset for next card
      setCurrentCardIndex(0);
      setCurrentPhotoIndex(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

    } catch (error) {
      console.error('Error recording pass:', error);
      // Rollback local state on error
      setSwipedIds(prev => {
        const next = new Set(prev);
        next.delete(liker.swipeId);
        return next;
      });
    } finally {
      setIsProcessing(false);
    }
  }, [orderedLikers, userId, isProcessing, markAsActedOn]);

  /**
   * Handle all cards swiped
   * Don't navigate away if match animation is showing
   */
  const handleSwipedAll = useCallback(() => {
    // If match animation is about to show, don't navigate away yet
    // The animation handlers will take care of navigation
    // Use ref for synchronous check (state may not be updated yet)
    if (showMatchAnimationRef.current) return;
    
    // Small delay to let the last swipe's match animation trigger if needed
    setTimeout(() => {
      // Re-check after delay in case animation was triggered
      if (!showMatchAnimationRef.current) {
        Toast.show({
          type: 'info',
          text1: 'All Done!',
          text2: "You've gone through all your likes",
          visibilityTime: 2000,
        });
        navigation.goBack();
      }
    }, 100);
  }, [navigation]);

  /**
   * Handle "Send Message" from match animation
   */
  const handleSendMessage = useCallback(() => {
    if (!matchData) return;
    
    showMatchAnimationRef.current = false; // Reset ref
    setShowMatchAnimation(false);
    
    // Navigate to chat with the matched user
    navigation.navigate('Chat', {
      chatId: matchData.chatId || null,
      recipientId: matchData.matchedUser.id,
      recipientName: matchData.matchedUser.name,
      recipientPhoto: matchData.matchedUser.photos?.[0]?.url,
    });
    
    setMatchData(null);
  }, [matchData, navigation]);

  /**
   * Handle "Keep Swiping" from match animation
   */
  const handleKeepSwiping = useCallback(() => {
    showMatchAnimationRef.current = false; // Reset ref
    setShowMatchAnimation(false);
    setMatchData(null);
    
    // Check if there are more cards to swipe, if not go back
    if (orderedLikers.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'All Done!',
        text2: "You've gone through all your likes",
        visibilityTime: 2000,
      });
      navigation.goBack();
    }
  }, [orderedLikers.length, navigation]);

  /**
   * Render individual card
   */
  const renderCard = useCallback((liker: Liker, index: number) => {
    const photos = liker.photos || [];
    const photoIndex = index === currentCardIndex ? currentPhotoIndex : 0;
    const currentPhoto = photos[photoIndex]?.url || 'https://via.placeholder.com/400';
    const matchPercentage = Math.round(liker.matchScore);
    const distanceText = liker.distance !== null ? `${Math.round(liker.distance)} km away` : 'Location unknown';

    return (
      <View style={styles.card}>
        {/* Photo */}
        <Image source={{ uri: currentPhoto }} style={styles.cardImage} />

        {/* Photo navigation areas */}
        <TouchableOpacity
          style={styles.leftTapArea}
          onPress={() => handleCardTap('left')}
          activeOpacity={1}
        />
        <TouchableOpacity
          style={styles.rightTapArea}
          onPress={() => handleCardTap('right')}
          activeOpacity={1}
        />

        {/* Photo indicators */}
        {photos.length > 1 && (
          <View style={styles.photoIndicators}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.indicator,
                  i === (index === currentCardIndex ? currentPhotoIndex : 0) && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* "Liked You" badge */}
        <View style={styles.likedYouBadge}>
          <Ionicons name="heart" size={14} color="#FFFFFF" />
          <Text style={styles.likedYouText}>Liked You</Text>
        </View>

        {/* Match percentage badge */}
        <View style={styles.matchBadge}>
          <Text style={styles.matchPercentage}>{matchPercentage}%</Text>
          <Text style={styles.matchLabel}>Match</Text>
        </View>

        {/* Trust badge */}
        <View style={styles.trustBadge}>
          <Text style={styles.trustPercentage}>{calculateProfileCompleteness(liker)}%</Text>
          <Text style={styles.trustLabel}>Trusted</Text>
        </View>

        {/* Card info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.cardName}>
                  {liker.name}, {liker.age}
                </Text>
                {liker.isVerified && (
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                )}
              </View>
              <View style={styles.cardMeta}>
                <Ionicons name="location-outline" size={14} color="#999999" />
                <Text style={styles.cardDistance}>{distanceText}</Text>
              </View>
            </View>
          </View>

          {/* Bio preview */}
          {liker.bio && (
            <Text style={styles.cardBio} numberOfLines={2}>
              {liker.bio}
            </Text>
          )}

          {/* Interests preview */}
          {liker.interests && liker.interests.length > 0 && (
            <View style={styles.interestsTags}>
              {liker.interests.slice(0, 3).map((interest, i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
              {liker.interests.length > 3 && (
                <View style={styles.interestTag}>
                  <Text style={styles.interestText}>+{liker.interests.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }, [currentCardIndex, currentPhotoIndex, handleCardTap]);

  // Loading state
  if (loading && orderedLikers.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Who Liked You</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4458" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Empty state - only show if NO animation is pending or showing
  // When animation is active, we skip this and render the main view (which includes MatchAnimation)
  if (orderedLikers.length === 0 && !showMatchAnimation) {
    // Double-check ref - if ref says animation should show, skip empty state
    // This handles the timing gap between ref update and state update
    if (!showMatchAnimationRef.current) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.title}>Who Liked You</Text>
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>You've responded to all your likes</Text>
            <TouchableOpacity style={styles.backToHubButton} onPress={handleBack}>
              <Text style={styles.backToHubText}>Back to My Hub</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="heart" size={24} color="#FF4458" />
          <Text style={styles.title}>Who Liked You</Text>
        </View>
        <Text style={styles.counter}>
          {orderedLikers.length} remaining
        </Text>
      </View>

      {/* Processing indicator */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="small" color="#FF4458" />
        </View>
      )}

      {/* Main Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Card Swiper */}
        <View style={styles.swiperContainer}>
          <CardSwiper
            key={`swiper-${cardSwiperKey.current}`}
            data={orderedLikers}
            renderCard={renderCard}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onSwipedAll={handleSwipedAll}
            stackSize={3}
          />
        </View>

        {/* Scroll indicator */}
        {currentLiker && (
          <View style={styles.scrollIndicator}>
            <Ionicons name="chevron-down" size={24} color="#999999" />
            <Text style={styles.scrollHintText}>Scroll for more details</Text>
          </View>
        )}

        {/* Profile Details Section */}
        {currentLiker && (
          <View style={styles.profileDetailsContainer}>
            {/* Basic Info Header */}
            <View style={styles.detailHeader}>
              <Text style={styles.detailName}>{currentLiker.name}, {currentLiker.age}</Text>
              <View style={styles.detailLocation}>
                <Ionicons name="location-outline" size={16} color="#666666" />
                <Text style={styles.detailLocationText}>
                  {currentLiker.distance !== null ? `${Math.round(currentLiker.distance)} km away` : 'Location unknown'}
                </Text>
              </View>
            </View>

            {/* Bio Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Bio</Text>
              <Text style={styles.detailSectionContent}>
                {currentLiker.bio || 'No bio added yet'}
              </Text>
            </View>

            {/* Interests Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Interests</Text>
              {currentLiker.interests && currentLiker.interests.length > 0 ? (
                <View style={styles.interestsContainer}>
                  {currentLiker.interests.map((interest, index) => (
                    <View key={index} style={styles.interestChip}>
                      <Text style={styles.interestChipText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.detailEmptyText}>No interests added yet</Text>
              )}
            </View>

            {/* Looking For Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Looking For</Text>
              <Text style={styles.detailSectionContent}>
                {currentLiker.relationshipIntent || 'Not specified'}
              </Text>
            </View>

            {/* Interested In Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Interested In</Text>
              {currentLiker.interestedIn && currentLiker.interestedIn.length > 0 ? (
                <View style={styles.interestsContainer}>
                  {currentLiker.interestedIn.map((gender, index) => (
                    <View key={index} style={styles.preferenceChip}>
                      <Text style={styles.preferenceChipText}>{gender}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.detailEmptyText}>Not specified</Text>
              )}
            </View>

            {/* Gender Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Gender</Text>
              <Text style={styles.detailSectionContent}>
                {currentLiker.gender || 'Not specified'}
              </Text>
            </View>

            {/* Match Score Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Match Score</Text>
              <View style={styles.matchScoreContainer}>
                <View style={styles.matchScoreBar}>
                  <View style={[styles.matchScoreFill, { width: `${Math.min(currentLiker.matchScore, 100)}%` }]} />
                </View>
                <Text style={styles.matchScoreText}>{Math.round(currentLiker.matchScore)}%</Text>
              </View>
            </View>

            {/* Bottom padding */}
            <View style={styles.bottomPadding} />
          </View>
        )}
      </ScrollView>

      {/* Match Animation Overlay */}
      <MatchAnimation
        visible={showMatchAnimation}
        currentUserPhoto={currentUserPhoto}
        matchedUserPhoto={matchData?.matchedUser.photos.find(p => p.isPrimary)?.url || matchData?.matchedUser.photos[0]?.url}
        matchedUserName={matchData?.matchedUser.name}
        onSendMessage={handleSendMessage}
        onKeepSwiping={handleKeepSwiping}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  counter: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
  },
  swiperContainer: {
    height: CARD_HEIGHT + 40,
    paddingTop: 10,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '70%',
    resizeMode: 'cover',
  },
  leftTapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '40%',
    height: '70%',
  },
  rightTapArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '40%',
    height: '70%',
  },
  photoIndicators: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  indicator: {
    width: 30,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  likedYouBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#FF4458',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likedYouText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  matchBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FF4458',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  matchPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  matchLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  trustBadge: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
  },
  trustPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  trustLabel: {
    fontSize: 9,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  cardDistance: {
    fontSize: 14,
    color: '#999999',
  },
  cardBio: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#FFF0F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    fontSize: 12,
    color: '#FF4458',
    fontWeight: '500',
  },
  scrollIndicator: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scrollHintText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
  },
  profileDetailsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    marginTop: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  detailHeader: {
    marginBottom: 24,
  },
  detailName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  detailLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLocationText: {
    fontSize: 15,
    color: '#666666',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  detailSectionContent: {
    fontSize: 16,
    color: '#444444',
    lineHeight: 24,
  },
  detailEmptyText: {
    fontSize: 15,
    color: '#999999',
    fontStyle: 'italic',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: '#FFF0F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD6DA',
  },
  interestChipText: {
    fontSize: 14,
    color: '#FF4458',
    fontWeight: '500',
  },
  preferenceChip: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  preferenceChipText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verificationText: {
    fontSize: 15,
    fontWeight: '500',
  },
  matchScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchScoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  matchScoreFill: {
    height: '100%',
    backgroundColor: '#FF4458',
    borderRadius: 4,
  },
  matchScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4458',
    width: 45,
    textAlign: 'right',
  },
  bottomPadding: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  processingOverlay: {
    position: 'absolute',
    top: 100,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backToHubButton: {
    backgroundColor: '#FF4458',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backToHubText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default LikesSwiperScreen;
