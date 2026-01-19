/**
 * SWIPE HUB SCREEN (Main Homepage)
 * 
 * Where users see and swipe on potential matches
 * - Card-based interface with Tinder-style swipes
 * - Match scoring algorithm
 * - Photo slideshow on each card
 * - Swipe actions: like (right), pass (left)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CardSwiper from '../../components/CardSwiper';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import { calculateMatchScore, calculateDistance, passesFilters } from '../../utils/matchScoring';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = height * 0.65;

interface Match {
  id: string;
  fullName: string;
  age: number;
  gender: string;
  bio: string;
  interests: string[];
  relationshipIntent: string | null;
  photos: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  matchScore: number;
  lastActiveAt?: any;
}

const SwipeHubScreen = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const userId = auth().currentUser?.uid;

  /**
   * Fetch potential matches
   */
  useEffect(() => {
    if (!userId) return;
    
    const fetchMatches = async () => {
      try {
        // Get current user data
        const currentUserDoc = await firestore().collection('users').doc(userId).get();
        const currentUserData = currentUserDoc.data();
        
        if (!currentUserData) {
          setLoading(false);
          return;
        }

        console.log('🔍 Current user data:', {
          uid: userId,
          accountType: currentUserData.accountType,
          hasInterests: currentUserData.interests?.length || 0,
          hasRelationshipIntent: !!currentUserData.relationshipIntent,
          hasInterestedIn: currentUserData.interestedIn?.length || 0,
        });

        // Get already swiped user IDs
        const swipedDocs = await firestore()
          .collection('swipes')
          .where('fromUserId', '==', userId)
          .get();
        
        const swipedUserIds = swipedDocs.docs.map(doc => doc.data().toUserId);

        // Check if user has filled ANY preferences
        const hasFilledPreferences = 
          (currentUserData.interests && currentUserData.interests.length > 0) ||
          currentUserData.relationshipIntent;

        // Check if user has selected gender preference
        const hasGenderPreference = 
          currentUserData.interestedIn && currentUserData.interestedIn.length > 0;

        // Fetch all users (we'll filter client-side for now)
        const usersSnapshot = await firestore()
          .collection('users')
          .limit(50)
          .get();

        console.log('📊 Query results:', {
          totalUsers: usersSnapshot.size,
          swipedCount: swipedUserIds.length,
        });

        const potentialMatches: Match[] = [];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const matchUserId = doc.id;

          // Skip self and already swiped users
          if (matchUserId === userId || swipedUserIds.includes(matchUserId)) {
            return;
          }

          // Calculate distance
          let distance = 0;
          if (currentUserData.location && userData.location) {
            distance = calculateDistance(
              currentUserData.location.latitude,
              currentUserData.location.longitude,
              userData.location.latitude,
              userData.location.longitude
            );
          }

          // If user hasn't filled ANY preferences, show random cards (no filtering, no scoring)
          if (!hasFilledPreferences) {
            potentialMatches.push({
              id: matchUserId,
              fullName: userData.fullName || 'Unknown',
              age: userData.age || 25,
              gender: userData.gender,
              bio: userData.bio || '',
              interests: userData.interests || [],
              relationshipIntent: userData.relationshipIntent,
              photos: userData.photos || [],
              location: userData.location,
              distance: Math.round(distance),
              matchScore: 0, // No scoring for users without preferences
              lastActiveAt: userData.lastActiveAt,
            });
            return;
          }

          // If user has preferences but NO gender preference, skip gender filtering
          // but still apply other filters (radius, intent)
          if (hasFilledPreferences && !hasGenderPreference) {
            // Apply filters WITHOUT gender check
            const passes = passesFilters(
              {
                interestedIn: [], // Empty array = show all genders
                matchRadiusKm: currentUserData.matchRadiusKm || 25,
                relationshipIntent: currentUserData.relationshipIntent,
              },
              {
                gender: userData.gender,
                relationshipIntent: userData.relationshipIntent,
              },
              distance
            );

            if (!passes) return;

            // Calculate match score based on interests, intent, distance
            const matchScore = calculateMatchScore(
              {
                location: currentUserData.location,
                matchRadiusKm: currentUserData.matchRadiusKm || 25,
                relationshipIntent: currentUserData.relationshipIntent,
                interests: currentUserData.interests || [],
                lastActiveAt: currentUserData.lastActiveAt,
              },
              {
                location: userData.location,
                matchRadiusKm: userData.matchRadiusKm,
                relationshipIntent: userData.relationshipIntent,
                interests: userData.interests || [],
                lastActiveAt: userData.lastActiveAt,
              },
              distance
            );

            potentialMatches.push({
              id: matchUserId,
              fullName: userData.fullName || 'Unknown',
              age: userData.age || 25,
              gender: userData.gender,
              bio: userData.bio || '',
              interests: userData.interests || [],
              relationshipIntent: userData.relationshipIntent,
              photos: userData.photos || [],
              location: userData.location,
              distance: Math.round(distance),
              matchScore,
              lastActiveAt: userData.lastActiveAt,
            });
            return;
          }

          // If user has full preferences (including gender), apply all filters
          const passes = passesFilters(
            {
              interestedIn: currentUserData.interestedIn || [],
              matchRadiusKm: currentUserData.matchRadiusKm || 25,
              relationshipIntent: currentUserData.relationshipIntent,
            },
            {
              gender: userData.gender,
              relationshipIntent: userData.relationshipIntent,
            },
            distance
          );

          if (!passes) return;

          // Calculate match score
          const matchScore = calculateMatchScore(
            {
              location: currentUserData.location,
              matchRadiusKm: currentUserData.matchRadiusKm || 25,
              relationshipIntent: currentUserData.relationshipIntent,
              interests: currentUserData.interests || [],
              lastActiveAt: currentUserData.lastActiveAt,
            },
            {
              location: userData.location,
              matchRadiusKm: userData.matchRadiusKm,
              relationshipIntent: userData.relationshipIntent,
              interests: userData.interests || [],
              lastActiveAt: userData.lastActiveAt,
            },
            distance
          );

          potentialMatches.push({
            id: matchUserId,
            fullName: userData.fullName || 'Unknown',
            age: userData.age || 25,
            gender: userData.gender,
            bio: userData.bio || '',
            interests: userData.interests || [],
            relationshipIntent: userData.relationshipIntent,
            photos: userData.photos || [],
            location: userData.location,
            distance: Math.round(distance),
            matchScore,
            lastActiveAt: userData.lastActiveAt,
          });
        });
        console.log('✅ Potential matches found:', {
          total: potentialMatches.length,
          hasPreferences: hasFilledPreferences,
          hasGenderPref: hasGenderPreference,
        });
        // Sort by match score (highest first) if user has preferences
        // Otherwise shuffle randomly for users without preferences
        if (hasFilledPreferences) {
          potentialMatches.sort((a, b) => b.matchScore - a.matchScore);
        } else {
          // Shuffle array randomly (Fisher-Yates algorithm)
          for (let i = potentialMatches.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [potentialMatches[i], potentialMatches[j]] = [potentialMatches[j], potentialMatches[i]];
          }
        }

        setMatches(potentialMatches);
        setLoading(false);

      } catch (error) {
        console.error('Error fetching matches:', error);
        setLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Failed to Load Matches',
          text2: 'Please try again',
          visibilityTime: 3000,
        });
      }
    };

    fetchMatches();
  }, [userId]);

  /**
   * Handle swipe right (like)
   */
  const handleSwipeRight = async (cardIndex: number) => {
    const match = matches[cardIndex];
    if (!match || !userId) return;

    try {
      // Save swipe to Firestore
      await firestore().collection('swipes').add({
        fromUserId: userId,
        toUserId: match.id,
        action: 'like',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create notification for the liked user
      await firestore().collection('notifications').add({
        userId: match.id,
        type: 'like_received',
        fromUserId: userId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        read: false,
      });

      console.log(`✅ Liked: ${match.fullName}`);
      
      // Reset photo index for next card
      setCurrentCardIndex(cardIndex + 1);
      setCurrentPhotoIndex(0);
    } catch (error) {
      console.error('Error saving like:', error);
    }
  };

  /**
   * Handle swipe left (pass)
   */
  const handleSwipeLeft = async (cardIndex: number) => {
    const match = matches[cardIndex];
    if (!match || !userId) return;

    try {
      // Save swipe to Firestore
      await firestore().collection('swipes').add({
        fromUserId: userId,
        toUserId: match.id,
        action: 'pass',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      console.log(`❌ Passed: ${match.fullName}`);
      
      // Reset photo index for next card
      setCurrentCardIndex(cardIndex + 1);
      setCurrentPhotoIndex(0);
    } catch (error) {
      console.error('Error saving pass:', error);
    }
  };

  /**
   * Navigate photos in current card
   */
  const handleCardTap = (side: 'left' | 'right') => {
    const currentMatch = matches[currentCardIndex];
    if (!currentMatch || !currentMatch.photos.length) return;

    if (side === 'right') {
      setCurrentPhotoIndex((prev) =>
        prev < currentMatch.photos.length - 1 ? prev + 1 : 0
      );
    } else {
      setCurrentPhotoIndex((prev) =>
        prev > 0 ? prev - 1 : currentMatch.photos.length - 1
      );
    }
  };

  /**
   * Render individual card
   */
  const renderCard = (match: Match, index: number) => {
    const currentPhoto = match.photos[currentPhotoIndex] || 'https://via.placeholder.com/400';
    const matchPercentage = Math.round(match.matchScore);

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
        {match.photos.length > 1 && (
          <View style={styles.photoIndicators}>
            {match.photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.indicator,
                  i === currentPhotoIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Match percentage badge */}
        <View style={styles.matchBadge}>
          <Text style={styles.matchPercentage}>{matchPercentage}%</Text>
          <Text style={styles.matchLabel}>Match</Text>
        </View>

        {/* Card info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardName}>
                {match.fullName}, {match.age}
              </Text>
              <View style={styles.cardMeta}>
                <Ionicons name="location-outline" size={14} color="#999999" />
                <Text style={styles.cardDistance}>{match.distance} km away</Text>
              </View>
            </View>
          </View>

          {/* Bio preview */}
          {match.bio && (
            <Text style={styles.cardBio} numberOfLines={2}>
              {match.bio}
            </Text>
          )}

          {/* Interests preview */}
          {match.interests.length > 0 && (
            <View style={styles.interestsTags}>
              {match.interests.slice(0, 3).map((interest, i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
              {match.interests.length > 3 && (
                <View style={styles.interestTag}>
                  <Text style={styles.interestText}>+{match.interests.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#FF4458" />
        <Text style={styles.loadingText}>Finding matches...</Text>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="heart" size={32} color="#FF4458" />
          <Text style={styles.title}>Swipe Hub</Text>
        </View>

        {/* No matches content */}
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Matches Yet</Text>
          <Text style={styles.emptyText}>
            Check back later for new profiles!{'\n'}Try adjusting your preferences or radius.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="heart" size={32} color="#FF4458" />
        <Text style={styles.title}>Swipe Hub</Text>
      </View>

      {/* Swiper */}
      <View style={styles.swiperContainer}>
        <CardSwiper
          data={matches}
          renderCard={renderCard}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
          stackSize={3}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  swiperContainer: {
    flex: 1,
    paddingTop: 20,
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
    marginTop: -2,
  },
  cardInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 8,
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  interestTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestText: {
    fontSize: 12,
    color: '#666666',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 60,
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  likeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4ECDC4',
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
    lineHeight: 24,
  },
});

export default SwipeHubScreen;
