/**
 * CHAT SCREEN
 * 
 * Dual-state chat interface:
 * - Restricted (isMutual: false): Shadow message chips only
 * - Mutual (isMutual: true): Full text input with photo sharing
 * 
 * Features:
 * - Photo sharing via image picker (mutual only)
 * - Message reactions with long-press
 * - Seen status and relative timestamps
 * 
 * Entry points:
 * - "Send Message" button in Match Animation overlay
 * - Tapping existing conversation in My Hub
 * - Tapping user from Global Search (future)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  TouchableWithoutFeedback,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import { Chat, Message, User } from '../../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Reaction emojis
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

// Extended emoji list for the "more" modal
const EXTENDED_EMOJIS = [
  '❤️', '😂', '😮', '😢', '😡', '👍',
  '🔥', '💯', '🙌', '👏', '🎉', '💪',
  '😍', '🥰', '😘', '😊', '🤗', '😎',
  '🤔', '😏', '🙄', '😴', '🤮', '💀',
  '👀', '🙏', '✨', '💕', '💔', '🤝',
];

// Shadow message chips for restricted chat
const SHADOW_CHIPS = [
  { id: '1', text: "Hey! Love your bio! 👋" },
  { id: '2', text: "Your photos are amazing! 📸" },
  { id: '3', text: "Wanna catch an event sometime? 🎉" },
  { id: '4', text: "We have so much in common! ✨" },
  { id: '5', text: "Would love to get to know you! 💬" },
  { id: '6', text: "Your vibe is awesome! 🔥" },
];

type ChatRouteParams = {
  Chat: {
    chatId: string | null; // null for new chats (global search)
    recipientId: string;
    recipientName?: string;
    recipientPhoto?: string;
  };
};

interface MessageWithId extends Message {
  id: string;
}

const ChatScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ChatRouteParams, 'Chat'>>();
  const { chatId: initialChatId, recipientId, recipientName, recipientPhoto } = route.params;

  const userId = auth().currentUser?.uid;
  const flatListRef = useRef<FlatList>(null);

  // State
  const [chatId, setChatId] = useState<string | null>(initialChatId);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<MessageWithId[]>([]);
  const [recipient, setRecipient] = useState<Partial<User> | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMutual, setIsMutual] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [recipientLastRead, setRecipientLastRead] = useState<any>(null); // When recipient last read the chat
  
  // Reaction overlay state
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0, isOwnMessage: false });
  const [showExtendedEmojis, setShowExtendedEmojis] = useState(false);

  // Keyboard height animation for Android
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  /**
   * Handle keyboard show/hide for Android
   */
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [keyboardHeight]);

  /**
   * Fetch recipient profile
   */
  useEffect(() => {
    const fetchRecipient = async () => {
      if (!recipientId) return;

      try {
        const userDoc = await firestore().collection('users').doc(recipientId).get();
        if (userDoc.exists()) {
          setRecipient({ id: userDoc.id, ...userDoc.data() } as User);
        }
      } catch (error) {
        console.error('Error fetching recipient:', error);
      }
    };

    // Use passed props first, fetch if not available
    if (recipientName && recipientPhoto) {
      setRecipient({
        id: recipientId,
        name: recipientName,
        photos: [{ url: recipientPhoto, isPrimary: true }],
      } as Partial<User>);
    }
    
    fetchRecipient();
  }, [recipientId, recipientName, recipientPhoto]);

  /**
   * Fetch or create chat document
   */
  useEffect(() => {
    const initializeChat = async () => {
      if (!userId || !recipientId) {
        setLoading(false);
        return;
      }

      try {
        if (chatId) {
          // Existing chat - fetch it
          const chatDoc = await firestore().collection('chats').doc(chatId).get();
          if (chatDoc.exists()) {
            const chatData = { id: chatDoc.id, ...chatDoc.data() } as Chat;
            setChat(chatData);
            setIsMutual(chatData.isMutual);
          } else {
            // Chat was deleted - go back
            console.warn('Chat not found, may have been deleted');
            navigation.goBack();
            return;
          }
        } else {
          // No chatId - check if chat exists between these users
          const existingChat = await firestore()
            .collection('chats')
            .where('participants', 'array-contains', userId)
            .get();

          const foundChat = existingChat.docs.find((doc) => {
            const data = doc.data();
            return data.participants.includes(recipientId);
          });

          if (foundChat) {
            // Chat already exists
            const chatData = { id: foundChat.id, ...foundChat.data() } as Chat;
            setChatId(foundChat.id);
            setChat(chatData);
            setIsMutual(chatData.isMutual);
          } else {
            // Create new restricted chat (cold outreach from global search)
            const newChatRef = await firestore().collection('chats').add({
              type: 'dating',
              participants: [userId, recipientId],
              relatedMatchId: null,
              isMutual: false, // Restricted by default
              lastMessage: null,
              relatedEventId: null,
              deletionPolicy: {
                type: 'none',
                days: null,
              },
              allowDeleteForEveryone: false,
              deleteForEveryoneWindowDays: null,
              createdAt: firestore.FieldValue.serverTimestamp(),
              lastMessageAt: firestore.FieldValue.serverTimestamp(),
            });

            setChatId(newChatRef.id);
            setChat({
              id: newChatRef.id,
              type: 'dating',
              participants: [userId, recipientId],
              relatedMatchId: null,
              isMutual: false,
              lastMessage: null,
              relatedEventId: null,
              deletionPolicy: { type: 'none', days: null },
              allowDeleteForEveryone: false,
              deleteForEveryoneWindowDays: null,
              createdAt: new Date(),
              lastMessageAt: new Date(),
            });
            setIsMutual(false);
          }
        }
      } catch (error: any) {
        console.error('Error initializing chat:', error);
        // Permission denied means chat was deleted or user removed
        if (error.code === 'permission-denied') {
          navigation.goBack();
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [userId, recipientId, chatId, navigation]);

  /**
   * Real-time messages listener
   */
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = firestore()
      .collection('messages')
      .where('chatId', '==', chatId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        (snapshot) => {
          const msgs: MessageWithId[] = [];
          snapshot.forEach((doc) => {
            msgs.push({ id: doc.id, ...doc.data() } as MessageWithId);
          });
          setMessages(msgs);
        },
        (error) => {
          console.error('Messages listener error:', error);
        }
      );

    return () => unsubscribe();
  }, [chatId]);

  /**
   * Real-time chat listener (for isMutual updates and seen status)
   */
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = firestore()
      .collection('chats')
      .doc(chatId)
      .onSnapshot(
        (doc) => {
          if (doc.exists()) {
            const chatData = { id: doc.id, ...doc.data() } as Chat;
            setChat(chatData);
            setIsMutual(chatData.isMutual);
            
            // Track when recipient last read the chat
            if (chatData.lastReadBy && recipientId) {
              setRecipientLastRead(chatData.lastReadBy[recipientId] || null);
            }
          } else {
            // Chat was deleted - navigate back
            console.warn('Chat document no longer exists');
            navigation.goBack();
          }
        },
        (error: any) => {
          console.error('Chat listener error:', error);
          // Permission denied usually means chat was deleted or user removed
          if (error.code === 'permission-denied') {
            navigation.goBack();
          }
        }
      );

    return () => unsubscribe();
  }, [chatId, recipientId]);

  /**
   * Mark chat as read when user views it
   */
  useEffect(() => {
    if (!chatId || !userId) return;

    // Update lastReadBy for current user
    const markAsRead = async () => {
      try {
        await firestore()
          .collection('chats')
          .doc(chatId)
          .update({
            [`lastReadBy.${userId}`]: firestore.FieldValue.serverTimestamp(),
          });
      } catch (error) {
        // Ignore errors - chat might not exist yet or user doesn't have permission
        console.log('Could not mark chat as read:', error);
      }
    };

    markAsRead();
  }, [chatId, userId, messages.length]); // Re-run when new messages arrive

  /**
   * Send a text message (mutual chat only)
   */
  const sendTextMessage = async () => {
    if (!inputText.trim() || !chatId || !userId || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);
    // Keep keyboard open - user can dismiss manually

    try {
      // Create message document
      await firestore().collection('messages').add({
        chatId,
        senderId: userId,
        type: 'text',
        content: messageText,
        reactions: {},
        deletedForEveryone: false,
        deletedForEveryoneAt: null,
        deletedForEveryoneBy: null,
        deletedForUsers: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Update chat's lastMessage
      await firestore().collection('chats').doc(chatId).update({
        lastMessage: {
          text: messageText,
          senderId: userId,
          timestamp: firestore.FieldValue.serverTimestamp(),
        },
        lastMessageAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageText); // Restore input on error
    } finally {
      setSending(false);
    }
  };

  /**
   * Send a shadow chip message (restricted chat)
   */
  const sendShadowChip = async (chipText: string) => {
    if (!chatId || !userId || sending) return;

    setSending(true);

    try {
      // Create shadow chip message
      await firestore().collection('messages').add({
        chatId,
        senderId: userId,
        type: 'shadow_chip',
        content: chipText,
        reactions: {},
        deletedForEveryone: false,
        deletedForEveryoneAt: null,
        deletedForEveryoneBy: null,
        deletedForUsers: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Update chat's lastMessage
      await firestore().collection('chats').doc(chatId).update({
        lastMessage: {
          text: chipText,
          senderId: userId,
          timestamp: firestore.FieldValue.serverTimestamp(),
        },
        lastMessageAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending shadow chip:', error);
    } finally {
      setSending(false);
    }
  };

  /**
   * Pick and send a photo (mutual chats only)
   */
  const handlePickPhoto = async () => {
    if (!chatId || !userId || uploadingPhoto) return;

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (result.didCancel || !result.assets?.[0]?.uri) return;

      const photo = result.assets[0];
      const photoUri = photo.uri!;
      setUploadingPhoto(true);

      // Upload to Firebase Storage
      const filename = `chat_images/${chatId}/${Date.now()}_${userId}.jpg`;
      const reference = storage().ref(filename);
      
      await reference.putFile(photoUri);
      const downloadUrl = await reference.getDownloadURL();

      // Create image message
      await firestore().collection('messages').add({
        chatId,
        senderId: userId,
        type: 'image',
        content: downloadUrl,
        reactions: {},
        deletedForEveryone: false,
        deletedForEveryoneAt: null,
        deletedForEveryoneBy: null,
        deletedForUsers: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Update chat's lastMessage
      await firestore().collection('chats').doc(chatId).update({
        lastMessage: {
          text: '📷 Photo',
          senderId: userId,
          timestamp: firestore.FieldValue.serverTimestamp(),
        },
        lastMessageAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  /**
   * Handle long press on a message to show reaction picker
   */
  const handleMessageLongPress = (messageId: string, event: any, isOwnMessage: boolean) => {
    const { pageY } = event.nativeEvent;
    setReactionPosition({ x: 0, y: pageY, isOwnMessage });
    setReactionMessageId(messageId);
    setShowExtendedEmojis(false);
  };

  /**
   * Add a reaction to a message
   */
  const handleAddReaction = async (emoji: string) => {
    if (!reactionMessageId || !userId) return;

    try {
      const messageRef = firestore().collection('messages').doc(reactionMessageId);
      const messageDoc = await messageRef.get();
      
      if (messageDoc.exists()) {
        const currentReactions = messageDoc.data()?.reactions || {};
        
        // Toggle reaction: if user already reacted with this emoji, remove it
        if (currentReactions[userId] === emoji) {
          await messageRef.update({
            [`reactions.${userId}`]: firestore.FieldValue.delete(),
          });
        } else {
          await messageRef.update({
            [`reactions.${userId}`]: emoji,
          });
        }
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    } finally {
      setReactionMessageId(null);
      setShowExtendedEmojis(false);
    }
  };

  /**
   * Format relative timestamp
   */
  const formatRelativeTime = (timestamp: any): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  /**
   * Navigate back
   */
  const handleBack = () => {
    navigation.goBack();
  };

  /**
   * Render a single message
   */
  const renderMessage = useCallback(
    ({ item, index }: { item: MessageWithId; index: number }) => {
      const isOwnMessage = item.senderId === userId;
      const isShadowChip = item.type === 'shadow_chip';
      const isImage = item.type === 'image';
      const reactions = item.reactions || {};
      const reactionEntries = Object.entries(reactions);
      const hasReactions = reactionEntries.length > 0;

      // Group reactions by emoji
      const reactionCounts: { [emoji: string]: number } = {};
      reactionEntries.forEach(([_, emoji]) => {
        reactionCounts[emoji as string] = (reactionCounts[emoji as string] || 0) + 1;
      });

      return (
        <Pressable
          onLongPress={(e) => handleMessageLongPress(item.id, e, isOwnMessage)}
          delayLongPress={300}
          style={[styles.messageContainer, isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer]}
        >
          <View style={styles.messageBubbleWrapper}>
            <View
              style={[
                styles.messageBubble,
                isOwnMessage ? styles.ownMessage : styles.otherMessage,
                isShadowChip && styles.shadowChipMessage,
                isImage && styles.imageMessage,
              ]}
            >
            {/* Image message */}
            {isImage ? (
              <Image
                source={{ uri: item.content }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : (
              /* Text/Shadow chip message */
              <Text
                style={[
                  styles.messageText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                ]}
              >
                {item.content}
              </Text>
            )}

            {isShadowChip && (
              <View style={styles.shadowChipBadge}>
                <Text style={styles.shadowChipBadgeText}>Quick Message</Text>
              </View>
            )}

            {/* Timestamp */}
            <Text
              style={[
                styles.messageTimestamp,
                isOwnMessage ? styles.ownMessageTimestamp : styles.otherMessageTimestamp,
              ]}
            >
              {formatRelativeTime(item.createdAt)}
              {/* Seen status for own messages (only show for most recent) */}
              {isOwnMessage && index === 0 && (() => {
                // Check if recipient has read this message
                if (recipientLastRead && item.createdAt) {
                  const messageTime = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                  const readTime = recipientLastRead.toDate ? recipientLastRead.toDate() : new Date(recipientLastRead);
                  if (readTime >= messageTime) {
                    return ' • Seen';
                  }
                }
                return ' • Sent';
              })()}
            </Text>
            </View>

            {/* Reactions display - positioned at bottom corner of bubble */}
            {hasReactions && (
              <View style={[
                styles.reactionsContainer,
                isOwnMessage ? styles.ownReactionsContainer : styles.otherReactionsContainer,
                isImage ? styles.imageReactionsPosition : styles.textReactionsPosition,
              ]}>
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <View key={emoji} style={styles.reactionBubble}>
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [userId, recipientLastRead]
  );

  /**
   * Render shadow chip
   */
  const renderShadowChip = ({ item }: { item: typeof SHADOW_CHIPS[0] }) => (
    <TouchableOpacity
      style={styles.shadowChip}
      onPress={() => sendShadowChip(item.text)}
      disabled={sending}
    >
      <Text style={styles.shadowChipText}>{item.text}</Text>
    </TouchableOpacity>
  );

  /**
   * Render reaction picker overlay
   */
  const renderReactionPicker = () => {
    if (!reactionMessageId) return null;

    // Calculate position - center horizontally, position above the message
    const pickerTop = Math.max(100, reactionPosition.y - 80);

    return (
      <Modal
        visible={true}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setReactionMessageId(null);
          setShowExtendedEmojis(false);
        }}
      >
        <TouchableWithoutFeedback 
          onPress={() => {
            setReactionMessageId(null);
            setShowExtendedEmojis(false);
          }}
        >
          <View style={styles.reactionOverlay}>
            {/* Quick reaction picker - centered above message */}
            {!showExtendedEmojis && (
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={[
                    styles.reactionPicker,
                    { top: pickerTop },
                  ]}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.reactionOption}
                      onPress={() => handleAddReaction(emoji)}
                    >
                      <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                  {/* Plus button for more emojis */}
                  <TouchableOpacity
                    style={styles.reactionOptionMore}
                    onPress={() => setShowExtendedEmojis(true)}
                  >
                    <Ionicons name="add" size={24} color="#666666" />
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            )}

            {/* Extended emoji picker modal */}
            {showExtendedEmojis && (
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.extendedEmojiPicker}>
                  <View style={styles.extendedEmojiHeader}>
                    <Text style={styles.extendedEmojiTitle}>Choose Reaction</Text>
                    <TouchableOpacity 
                      onPress={() => setShowExtendedEmojis(false)}
                      style={styles.extendedEmojiClose}
                    >
                      <Ionicons name="close" size={24} color="#666666" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.extendedEmojiGrid}>
                    {EXTENDED_EMOJIS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={styles.extendedEmojiOption}
                        onPress={() => handleAddReaction(emoji)}
                      >
                        <Text style={styles.extendedEmojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // Get recipient display info
  const displayName = recipient?.name || recipientName || 'User';
  const displayPhoto =
    recipient?.photos?.find((p) => p.isPrimary)?.url ||
    recipient?.photos?.[0]?.url ||
    recipientPhoto ||
    'https://via.placeholder.com/100';

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4458" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerProfile}>
          <Image source={{ uri: displayPhoto }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {displayName}
            </Text>
            {!isMutual && (
              <Text style={styles.restrictedBadge}>Restricted Chat</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Restricted Chat Notice */}
      {!isMutual && (
        <View style={styles.restrictedNotice}>
          <Ionicons name="lock-closed" size={16} color="#FF9500" />
          <Text style={styles.restrictedNoticeText}>
            This is a restricted chat. Send a quick message to break the ice!
          </Text>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        style={styles.messageListContainer}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Ionicons name="chatbubbles-outline" size={60} color="#E0E0E0" />
            <Text style={styles.emptyMessagesText}>
              {isMutual
                ? 'Start the conversation!'
                : 'Send a quick message to connect!'}
            </Text>
          </View>
        }
      />

      {/* Input Area */}
      {isMutual ? (
        // Full text input for mutual chats with photo button
        <View style={styles.inputContainer}>
          {/* Photo picker button */}
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color="#FF4458" />
            ) : (
              <Ionicons name="image-outline" size={24} color="#FF4458" />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#999999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendTextMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // Shadow chips for restricted chats
        <View style={styles.shadowChipsContainer}>
          <Text style={styles.shadowChipsLabel}>Quick Messages</Text>
          <FlatList
            data={SHADOW_CHIPS}
            renderItem={renderShadowChip}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shadowChipsList}
          />
        </View>
      )}

      {/* Keyboard spacer for Android */}
      {Platform.OS === 'android' && (
        <Animated.View style={{ height: keyboardHeight }} />
      )}

      {/* Reaction Picker Modal */}
      {renderReactionPicker()}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  restrictedBadge: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
  },
  headerAction: {
    padding: 8,
  },
  restrictedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  restrictedNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#996600',
  },
  messageListContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownMessage: {
    backgroundColor: '#FF4458',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  shadowChipMessage: {
    borderWidth: 2,
    borderColor: '#FF4458',
    borderStyle: 'dashed',
  },
  messageContainer: {
    marginVertical: 2,
    marginBottom: 20, // Extra space for reactions below bubble
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubbleWrapper: {
    position: 'relative',
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1A1A1A',
  },
  imageMessage: {
    padding: 4,
    backgroundColor: 'transparent',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  messageTimestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  ownMessageTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTimestamp: {
    color: '#999999',
    textAlign: 'left',
  },
  reactionsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  ownReactionsContainer: {
    right: 8,
  },
  otherReactionsContainer: {
    left: 8,
  },
  textReactionsPosition: {
    bottom: -18,
  },
  imageReactionsPosition: {
    bottom: -4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    color: '#666666',
    marginLeft: 2,
  },
  shadowChipBadge: {
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  shadowChipBadgeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  photoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1A1A1A',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF4458',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  // Reaction picker styles
  reactionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  reactionPicker: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    alignSelf: 'center',
  },
  reactionOption: {
    padding: 8,
  },
  reactionOptionEmoji: {
    fontSize: 26,
  },
  reactionOptionMore: {
    padding: 8,
    marginLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  // Extended emoji picker styles
  extendedEmojiPicker: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: SCREEN_WIDTH - 40,
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  extendedEmojiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  extendedEmojiTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  extendedEmojiClose: {
    padding: 4,
  },
  extendedEmojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  extendedEmojiOption: {
    width: '16.66%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  extendedEmojiText: {
    fontSize: 28,
  },
  shadowChipsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  shadowChipsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  shadowChipsList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  shadowChip: {
    backgroundColor: '#FFF0F2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FF4458',
  },
  shadowChipText: {
    fontSize: 14,
    color: '#FF4458',
    fontWeight: '500',
  },
});

export default ChatScreen;
