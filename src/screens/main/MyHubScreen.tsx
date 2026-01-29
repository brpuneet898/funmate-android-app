/**
 * MY HUB SCREEN
 * 
 * Central hub for all communication:
 * - Dual-purpose search bar (local + global Algolia)
 * - Who Liked You (horizontal list - Top 20)
 * - Conversations list (ordered by lastMessageAt)
 */

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
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
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLikers } from '../../hooks/useLikers';
import { Liker, Chat, User } from '../../types/database';
import { searchUsers, isAlgoliaConfigured, AlgoliaUserRecord } from '../../config/algolia';
import { isUserBlocked } from '../../services/blockService';
import { deleteChat } from '../../services/chatService';
import WhoLikedYouFilterModal from '../../components/WhoLikedYouFilterModal';
import { WhoLikedYouFilters, DEFAULT_FILTERS } from '../../types/filters';

const { width } = Dimensions.get('window');
const LIKER_CARD_SIZE = 120;

// Conversation item with user details
interface ConversationItem {
  chatId: string;
  recipientId: string;
  recipientName: string;
  recipientPhoto: string | null;
  lastMessage: string;
  lastMessageAt: any;
  isMutual: boolean;
  unreadCount: number;
}

// Algolia search result (compatible with both Algolia and Firestore fallback)
interface AlgoliaUser {
  objectID: string;
  name: string;
  age: number;
  bio: string;
  photos: Array<{ url: string; isPrimary: boolean }>;
  isVerified: boolean;
}

const MyHubScreen = ({ navigation }: any) => {
  const userId = auth().currentUser?.uid;
  
  // Filter state
  const [filters, setFilters] = useState<WhoLikedYouFilters>(DEFAULT_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const {
    likers,
    loading,
    error,
    totalCount,
    refetch,
    hasMore,
    refillQueue,
    availableOccupations,
  } = useLikers(filters);

  // State for conversations
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<AlgoliaUser[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  // Delete state
  const [selectedChatForDelete, setSelectedChatForDelete] = useState<string | null>(null);

  // Refresh trigger for when returning from blocking
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isInitialMount = useRef(true);

  /**
   * Load saved filters from AsyncStorage
   */
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const saved = await AsyncStorage.getItem('whoLikedYouFilters');
        if (saved) {
          setFilters(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };
    loadFilters();
  }, []);

  /**
   * Count active filters
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.ageRange) count++;
    if (filters.heightRange) count++;
    if (filters.relationshipIntent && filters.relationshipIntent.length > 0) count++;
    if (filters.maxDistance !== null) count++;
    if (filters.occupations && filters.occupations.length > 0) count++;
    if (filters.trustScoreRange) count++;
    if (filters.matchScoreRange) count++;
    return count;
  }, [filters]);

  /**
   * Handle filter changes
   */
  const handleApplyFilters = async (newFilters: WhoLikedYouFilters) => {
    setFilters(newFilters);
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('whoLikedYouFilters', JSON.stringify(newFilters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  };

  /**
   * Refresh conversations when screen comes into focus (after blocking)
   */
  useFocusEffect(
    useCallback(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      // Trigger refresh by incrementing counter
      setRefreshTrigger(prev => prev + 1);
    }, [])
  );

  /**
   * Fetch conversations from Firestore
   */
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = firestore()
      .collection('chats')
      .where('participants', 'array-contains', userId)
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(
        async (snapshot) => {
          const convos: ConversationItem[] = [];

          for (const doc of snapshot.docs) {
            const chatData = doc.data() as Chat;
            
            // Skip deleted chats
            if (chatData.deletedAt) continue;
            
            // Get the other participant's ID
            const recipientId = chatData.participants.find(p => p !== userId);
            if (!recipientId) continue;

            // Skip chats where current user has blocked the recipient
            const hasBlockedRecipient = await isUserBlocked(userId, recipientId);
            if (hasBlockedRecipient) continue;

            // Fetch recipient user data
            try {
              const userDoc = await firestore()
                .collection('users')
                .doc(recipientId)
                .get();
              
              if (userDoc.exists) {
                const userData = userDoc.data() as User;
                const primaryPhoto = userData.photos?.find(p => p.isPrimary) || userData.photos?.[0];

                convos.push({
                  chatId: doc.id,
                  recipientId,
                  recipientName: userData.name || 'Unknown',
                  recipientPhoto: primaryPhoto?.url || null,
                  lastMessage: chatData.lastMessage?.text || 'Start a conversation',
                  lastMessageAt: chatData.lastMessageAt,
                  isMutual: chatData.isMutual,
                  unreadCount: 0, // TODO: Implement unread count
                });
              }
            } catch (err) {
              console.error('Error fetching recipient:', err);
            }
          }

          setConversations(convos);
          setConversationsLoading(false);
        },
        (err) => {
          console.error('Error fetching conversations:', err);
          setConversationsLoading(false);
        }
      );

    return () => unsubscribe();
  }, [userId, refreshTrigger]);

  /**
   * Filter conversations locally based on search query
   */
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.recipientName.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  /**
   * Check if we should show "Search Globally" button
   */
  const showSearchGloballyButton = useMemo(() => {
    return searchQuery.trim().length >= 2 && filteredConversations.length === 0;
  }, [searchQuery, filteredConversations]);

  /**
   * Perform global Algolia search (with Firestore fallback)
   */
  const handleGlobalSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setGlobalSearchLoading(true);
    setShowGlobalResults(true);

    try {
      let algoliaSuccess = false;

      // Try Algolia first if configured
      if (isAlgoliaConfigured()) {
        try {
          const algoliaResults = await searchUsers(searchQuery, {
            hitsPerPage: 30, // Fetch more to account for filtering
            filters: `NOT objectID:${userId}`, // Exclude self
          });

          if (algoliaResults && algoliaResults.length >= 0) {
            // Filter out event creators (users with creatorDetails populated)
            const datingUsers = (algoliaResults as any[]).filter(user => {
              // Exclude if creatorDetails exists and has organizationName
              const isEventCreator = user.creatorDetails?.organizationName || 
                                     user.creatorDetails?.experienceYears != null;
              return !isEventCreator;
            });
            setGlobalSearchResults(datingUsers as AlgoliaUser[]);
            algoliaSuccess = true;
          }
        } catch (algoliaError) {
          console.warn('Algolia search failed, falling back to Firestore:', algoliaError);
        }
      }

      // Fallback to Firestore search if Algolia failed or not configured
      if (!algoliaSuccess) {
        const usersSnapshot = await firestore()
          .collection('users')
          .orderBy('name')
          .startAt(searchQuery)
          .endAt(searchQuery + '\uf8ff')
          .limit(30)
          .get();

        const results: AlgoliaUser[] = usersSnapshot.docs
          .filter(doc => {
            if (doc.id === userId) return false; // Exclude self
            const data = doc.data() as User;
            // Exclude event creators
            const isEventCreator = (data as any).creatorDetails?.organizationName || 
                                   (data as any).creatorDetails?.experienceYears != null;
            return !isEventCreator;
          })
          .map(doc => {
            const data = doc.data() as User;
            return {
              objectID: doc.id,
              name: data.name || 'Unknown',
              age: data.age || 0,
              bio: data.bio || '',
              photos: data.photos || [],
              isVerified: data.isVerified || false,
            };
          });

        setGlobalSearchResults(results);
      }
    } catch (err) {
      console.error('Global search error:', err);
      setGlobalSearchResults([]);
    } finally {
      setGlobalSearchLoading(false);
    }
  }, [searchQuery, userId]);

  /**
   * Handle tapping a global search result
   */
  const handleGlobalResultPress = useCallback(async (user: AlgoliaUser) => {
    if (!userId) return;

    // Check if chat already exists
    const existingChat = conversations.find(c => c.recipientId === user.objectID);
    
    if (existingChat) {
      // Navigate to existing chat
      navigation.navigate('Chat', {
        chatId: existingChat.chatId,
        recipientId: user.objectID,
        recipientName: user.name,
        recipientPhoto: user.photos?.find(p => p.isPrimary)?.url || user.photos?.[0]?.url,
      });
    } else {
      // Navigate to new chat (shadow message state)
      navigation.navigate('Chat', {
        chatId: null, // Will create new chat
        recipientId: user.objectID,
        recipientName: user.name,
        recipientPhoto: user.photos?.find(p => p.isPrimary)?.url || user.photos?.[0]?.url,
      });
    }

    // Reset search
    setSearchQuery('');
    setShowGlobalResults(false);
    setGlobalSearchResults([]);
  }, [userId, conversations, navigation]);

  /**
   * Handle tapping a conversation
   */
  const handleConversationPress = useCallback((conv: ConversationItem) => {
    navigation.navigate('Chat', {
      chatId: conv.chatId,
      recipientId: conv.recipientId,
      recipientName: conv.recipientName,
      recipientPhoto: conv.recipientPhoto,
    });
  }, [navigation]);

  /**
   * Handle long-press on conversation (show delete bubble)
   */
  const handleConversationLongPress = useCallback((conv: ConversationItem, event: any) => {
    setSelectedChatForDelete(conv.chatId);
    // Position will be set by the item component
  }, []);

  /**
   * Handle delete chat action with confirmation
   */
  const handleDeleteChat = useCallback(async (chatId: string, recipientName: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!userId) return;
              await deleteChat(chatId, userId);
              setSelectedChatForDelete(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete chat. Please try again.');
            }
          },
        },
      ]
    );
  }, [userId]);

  /**
   * Deselect chat (tap elsewhere)
   */
  const handleDeselectChat = useCallback(() => {
    setSelectedChatForDelete(null);
  }, []);


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
        </View>
      </TouchableOpacity>
    );
  }, [handleLikerPress]);

  /**
   * Empty state for likers section - Compact design
   */
  const renderEmptyLikers = useCallback(() => (
    <View style={styles.emptyLikersContainer}>
      <Ionicons name="heart-outline" size={24} color="#CCCCCC" />
      <Text style={styles.emptyLikersText}>No likes yet</Text>
    </View>
  ), []);

  /**
   * Format relative time for conversations
   */
  const formatConversationTime = useCallback((timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  /**
   * Render a conversation item
   */
  const renderConversationItem = useCallback((conv: ConversationItem, index: number) => {
    const handleLongPress = () => {
      setSelectedChatForDelete(conv.chatId);
    };

    return (
      <View key={conv.chatId} collapsable={false}>
        <TouchableOpacity
          style={styles.conversationItem}
          onPress={() => handleConversationPress(conv)}
          onLongPress={handleLongPress}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          {/* Profile Photo */}
          {conv.recipientPhoto ? (
            <Image
              source={{ uri: conv.recipientPhoto }}
              style={styles.conversationPhoto}
            />
          ) : (
            <View style={[styles.conversationPhoto, styles.conversationPhotoPlaceholder]}>
              <Ionicons name="person" size={28} color="#CCCCCC" />
            </View>
          )}

          {/* Content */}
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.conversationName} numberOfLines={1}>
                {conv.recipientName}
              </Text>
              <Text style={styles.conversationTime}>
                {formatConversationTime(conv.lastMessageAt)}
              </Text>
            </View>
            <View style={styles.conversationPreviewRow}>
              <Text 
                style={[
                  styles.conversationPreview,
                  !conv.isMutual && styles.conversationPreviewMuted
                ]} 
                numberOfLines={1}
              >
                {conv.lastMessage}
              </Text>
              {!conv.isMutual && (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time-outline" size={12} color="#FF9800" />
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
        </TouchableOpacity>
      </View>
    );
  }, [handleConversationPress, formatConversationTime, selectedChatForDelete]);

  /**
   * Render global search result item
   */
  const renderGlobalSearchResult = useCallback((user: AlgoliaUser) => {
    const primaryPhoto = user.photos?.find(p => p.isPrimary) || user.photos?.[0];
    
    return (
      <TouchableOpacity
        key={user.objectID}
        style={styles.searchResultItem}
        onPress={() => handleGlobalResultPress(user)}
        activeOpacity={0.7}
      >
        {/* Photo */}
        {primaryPhoto?.url ? (
          <Image
            source={{ uri: primaryPhoto.url }}
            style={styles.searchResultPhoto}
          />
        ) : (
          <View style={[styles.searchResultPhoto, styles.searchResultPhotoPlaceholder]}>
            <Ionicons name="person" size={24} color="#CCCCCC" />
          </View>
        )}

        {/* Info */}
        <View style={styles.searchResultInfo}>
          <View style={styles.searchResultNameRow}>
            <Text style={styles.searchResultName}>{user.name}, {user.age}</Text>
            {user.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            )}
          </View>
          <Text style={styles.searchResultBio} numberOfLines={1}>
            {user.bio || 'No bio available'}
          </Text>
        </View>

        {/* Message Icon */}
        <View style={styles.searchResultAction}>
          <Ionicons name="chatbubble" size={18} color="#FF4458" />
        </View>
      </TouchableOpacity>
    );
  }, [handleGlobalResultPress]);

  /**
   * Empty state for conversations - Premium design
   */
  const renderEmptyConversations = useCallback(() => (
    <View style={styles.emptyConversationsContainer}>
      <Ionicons name="chatbubbles-outline" size={48} color="#E0E0E0" />
      <Text style={styles.emptyConversationsTitle}>No conversations yet</Text>
      <Text style={styles.emptyConversationsSubtext}>
        When you match with someone, your{'\n'}conversations will appear here
      </Text>
      <TouchableOpacity 
        style={styles.emptyConversationsButton}
        onPress={() => navigation.navigate('SwipeHub')}
      >
        <Ionicons name="flame" size={18} color="#FFFFFF" />
        <Text style={styles.emptyConversationsButtonText}>Start Swiping</Text>
      </TouchableOpacity>
    </View>
  ), [navigation]);

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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchInputContainer,
          searchFocused && styles.searchInputContainerFocused
        ]}>
          <Ionicons name="search" size={20} color="#999999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations or people..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowGlobalResults(false);
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            onSubmitEditing={handleGlobalSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setShowGlobalResults(false);
                setGlobalSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#999999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Global Search Results */}
      {showGlobalResults && (
        <View style={styles.globalSearchResults}>
          <View style={styles.globalSearchHeader}>
            <Text style={styles.globalSearchTitle}>
              <Ionicons name="globe-outline" size={16} color="#FF4458" /> Global Search
            </Text>
            <TouchableOpacity onPress={() => setShowGlobalResults(false)}>
              <Text style={styles.globalSearchClose}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {globalSearchLoading ? (
            <View style={styles.globalSearchLoading}>
              <ActivityIndicator size="small" color="#FF4458" />
              <Text style={styles.globalSearchLoadingText}>Searching...</Text>
            </View>
          ) : globalSearchResults.length > 0 ? (
            <ScrollView style={styles.globalSearchList}>
              {globalSearchResults.map(renderGlobalSearchResult)}
            </ScrollView>
          ) : (
            <View style={styles.globalSearchEmpty}>
              <Ionicons name="search-outline" size={40} color="#E0E0E0" />
              <Text style={styles.globalSearchEmptyText}>No users found</Text>
            </View>
          )}
        </View>
      )}

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
        {/* Search Globally Button (when no local results) */}
        {showSearchGloballyButton && !showGlobalResults && (
          <TouchableOpacity
            style={styles.searchGloballyButton}
            onPress={handleGlobalSearch}
          >
            <Ionicons name="globe-outline" size={20} color="#FFFFFF" />
            <Text style={styles.searchGloballyText}>Search Globally for "{searchQuery}"</Text>
          </TouchableOpacity>
        )}

        {/* Who Liked You Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="heart" size={22} color="#FF4458" />
              <Text style={styles.sectionTitle}>Who Liked You</Text>
            </View>
            <View style={styles.headerActions}>
              {totalCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {totalCount > 99 ? '99+' : totalCount}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowFilterModal(true)}
              >
                <Ionicons name="options-outline" size={20} color="#FF4458" />
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
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
            {filteredConversations.length > 0 && (
              <View style={styles.conversationCountBadge}>
                <Text style={styles.conversationCountText}>{filteredConversations.length}</Text>
              </View>
            )}
          </View>

          {/* Conversations List */}
          <TouchableOpacity 
            style={styles.conversationsList}
            activeOpacity={1}
            onPress={handleDeselectChat}
          >
            {conversationsLoading ? (
              <View style={styles.conversationsLoading}>
                <ActivityIndicator size="small" color="#FF4458" />
              </View>
            ) : filteredConversations.length > 0 ? (
              <>
                {filteredConversations.map((conv, index) => renderConversationItem(conv, index))}
              </>
            ) : searchQuery ? (
              <View style={styles.noSearchResults}>
                <Ionicons name="search-outline" size={40} color="#E0E0E0" />
                <Text style={styles.noSearchResultsText}>
                  No conversations match "{searchQuery}"
                </Text>
              </View>
            ) : (
              renderEmptyConversations()
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Bubble Popup */}
      {selectedChatForDelete && (
        <>
          {/* Transparent overlay to detect outside clicks */}
          <TouchableOpacity
            style={styles.bubbleBackdrop}
            activeOpacity={1}
            onPress={handleDeselectChat}
          />
          
          {/* Floating delete bubble - centered on screen */}
          <View style={styles.deleteBubble}>
            <TouchableOpacity
              style={styles.deleteBubbleButton}
              onPress={() => {
                const conv = conversations.find(c => c.chatId === selectedChatForDelete);
                if (conv) handleDeleteChat(conv.chatId, conv.recipientName);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.deleteBubbleText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Filter Modal */}
      <WhoLikedYouFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        availableOccupations={availableOccupations}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF0F1',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF4458',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyLikersText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999999',
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

  // Search styles
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchInputContainerFocused: {
    borderColor: '#FF4458',
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    padding: 0,
  },
  searchGloballyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4458',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  searchGloballyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Global search results
  globalSearchResults: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  globalSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  globalSearchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  globalSearchClose: {
    fontSize: 14,
    color: '#FF4458',
    fontWeight: '500',
  },
  globalSearchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  globalSearchLoadingText: {
    fontSize: 15,
    color: '#666666',
  },
  globalSearchList: {
    flex: 1,
  },
  globalSearchEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  globalSearchEmptyText: {
    fontSize: 16,
    color: '#999999',
    marginTop: 12,
  },

  // Search result item
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  searchResultPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  searchResultPhotoPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  searchResultBio: {
    fontSize: 14,
    color: '#999999',
    marginTop: 2,
  },
  searchResultAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF0F1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Conversation styles
  conversationCountBadge: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  conversationCountText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  conversationsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  conversationsList: {
    paddingHorizontal: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  // Delete bubble popup
  bubbleBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBubble: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: '#FF4458',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  deleteBubbleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteBubbleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  conversationPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  conversationPhotoPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 12,
    color: '#999999',
  },
  conversationPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conversationPreview: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  conversationPreviewMuted: {
    color: '#999999',
    fontStyle: 'italic',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
    padding: 4,
    borderRadius: 8,
  },
  noSearchResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noSearchResultsText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 12,
    textAlign: 'center',
  },

  // Empty conversations state
  emptyConversationsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 40,
  },
  emptyConversationsIcon: {
    position: 'relative',
    marginBottom: 16,
  },
  emptyConversationsHearts: {
    position: 'absolute',
    bottom: -8,
    right: -8,
  },
  emptyConversationsHeart: {
    fontSize: 24,
  },
  emptyConversationsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyConversationsSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyConversationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4458',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  emptyConversationsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Legacy placeholder styles (kept for compatibility)
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
