/**
 * CHAT SCREEN
 * 
 * Dual-state chat interface:
 * - Restricted (isMutual: false): Shadow message chips only
 * - Mutual (isMutual: true): Full text input
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Chat, Message, User } from '../../types/database';

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
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [userId, recipientId, chatId]);

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
   * Real-time chat listener (for isMutual updates)
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
          }
        },
        (error) => {
          console.error('Chat listener error:', error);
        }
      );

    return () => unsubscribe();
  }, [chatId]);

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
   * Navigate back
   */
  const handleBack = () => {
    navigation.goBack();
  };

  /**
   * Render a single message
   */
  const renderMessage = useCallback(
    ({ item }: { item: MessageWithId }) => {
      const isOwnMessage = item.senderId === userId;
      const isShadowChip = item.type === 'shadow_chip';

      return (
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
            isShadowChip && styles.shadowChipMessage,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
          {isShadowChip && (
            <View style={styles.shadowChipBadge}>
              <Text style={styles.shadowChipBadgeText}>Quick Message</Text>
            </View>
          )}
        </View>
      );
    },
    [userId]
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
        // Full text input for mutual chats
        <View style={styles.inputContainer}>
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
    transform: [{ scaleY: -1 }], // Flip because FlatList is inverted
  },
  emptyMessagesText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 4,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF4458',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
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
