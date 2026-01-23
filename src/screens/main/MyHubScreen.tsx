/**
 * MY HUB SCREEN
 * 
 * Central hub for all communication:
 * - Who Liked You (horizontal list - Top 20)
 * - Individual chats
 * - Group chats
 * - Event group chats
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLikers } from '../../hooks/useLikers';
import { Liker } from '../../types/database';

const { width } = Dimensions.get('window');
const LIKER_CARD_SIZE = 120;

const MyHubScreen = ({ navigation }: any) => {
  const {
    likers,
    loading,
    error,
    totalCount,
    refetch,
    hasMore,
    refillQueue,
  } = useLikers();

  /**
   * Handle tap on a liker card - opens the sub-swiper
   */
  const handleLikerPress = useCallback((liker: Liker, index: number) => {
    navigation.navigate('LikesSwiper', {
      clickedUserId: liker.id,
    });
  }, [navigation]);

  /**
   * Load more likers when reaching end of list
   */
  const handleEndReached = useCallback(() => {
    if (hasMore && !loading) {
      refillQueue();
    }
  }, [hasMore, loading, refillQueue]);

  /**
   * Render a single liker card
   */
  const renderLikerCard = useCallback(({ item, index }: { item: Liker; index: number }) => {
    const primaryPhoto = item.photos.find(p => p.isPrimary) || item.photos[0];
    const matchPercentage = Math.round(item.matchScore);

    return (
      <TouchableOpacity
        style={styles.likerCard}
        onPress={() => handleLikerPress(item, index)}
        activeOpacity={0.9}
      >
        {/* Photo */}
        {primaryPhoto?.url ? (
          <Image
            source={{ uri: primaryPhoto.url }}
            style={styles.likerPhoto}
          />
        ) : (
          <View style={[styles.likerPhoto, styles.noPhotoPlaceholder]}>
            <Ionicons name="person" size={40} color="#CCCCCC" />
          </View>
        )}

        {/* Gradient overlay */}
        <View style={styles.likerGradient} />

        {/* Match percentage badge */}
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>{matchPercentage}%</Text>
        </View>

        {/* Name at bottom */}
        <View style={styles.likerInfo}>
          <Text style={styles.likerName} numberOfLines={1}>
            {item.name}, {item.age}
          </Text>
          {item.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleLikerPress]);

  /**
   * Empty state for likers section
   */
  const renderEmptyLikers = useCallback(() => (
    <View style={styles.emptyLikersContainer}>
      <Ionicons name="heart-outline" size={40} color="#E0E0E0" />
      <Text style={styles.emptyLikersText}>No likes yet</Text>
      <Text style={styles.emptyLikersSubtext}>Keep swiping!</Text>
    </View>
  ), []);

  /**
   * Loading state
   */
  if (loading && likers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#FF4458" />
        <Text style={styles.loadingText}>Loading My Hub...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chatbubbles" size={32} color="#FF4458" />
        <Text style={styles.title}>My Hub</Text>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading && likers.length > 0}
            onRefresh={refetch}
            colors={['#FF4458']}
            tintColor="#FF4458"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Who Liked You Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="heart" size={22} color="#FF4458" />
              <Text style={styles.sectionTitle}>Who Liked You</Text>
            </View>
            {totalCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {totalCount > 99 ? '99+' : totalCount}
                </Text>
              </View>
            )}
          </View>

          {/* Horizontal Likers List */}
          {likers.length > 0 ? (
            <FlatList
              data={likers.slice(0, 20)}
              renderItem={renderLikerCard}
              keyExtractor={(item) => item.swipeId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.likersListContent}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                hasMore ? (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color="#FF4458" />
                  </View>
                ) : null
              }
            />
          ) : (
            renderEmptyLikers()
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Conversations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#FF4458" />
              <Text style={styles.sectionTitle}>Conversations</Text>
            </View>
          </View>

          {/* Placeholder for Conversations */}
          <View style={styles.conversationsPlaceholder}>
            <Ionicons name="chatbubbles-outline" size={60} color="#E0E0E0" />
            <Text style={styles.placeholderTitle}>No conversations yet</Text>
            <Text style={styles.placeholderSubtext}>
              When you match with someone, your{'\n'}conversation will appear here
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  countBadge: {
    backgroundColor: '#FF4458',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  likersListContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  likerCard: {
    width: LIKER_CARD_SIZE,
    height: LIKER_CARD_SIZE * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  likerPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noPhotoPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'transparent',
    // Simulating gradient with semi-transparent overlay
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF4458',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  matchBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  likerInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  likerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  emptyLikersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyLikersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginTop: 12,
  },
  emptyLikersSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
  },
  loadMoreContainer: {
    width: 60,
    height: LIKER_CARD_SIZE * 1.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 8,
    backgroundColor: '#E8E8E8',
    marginVertical: 8,
  },
  conversationsPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default MyHubScreen;
