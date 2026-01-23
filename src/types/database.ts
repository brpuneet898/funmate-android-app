/**
 * DATABASE TYPES
 * 
 * TypeScript interfaces matching Firestore schema
 */

// ==========================================
// SWIPES COLLECTION
// ==========================================
export interface Swipe {
  id?: string;
  fromUserId: string;
  toUserId: string;
  action: 'like' | 'pass' | 'superlike';
  actedOnByTarget: boolean;
  createdAt: any; // Firestore Timestamp
}

// ==========================================
// USERS COLLECTION
// ==========================================
export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  geoHash?: string;
}

export interface UserPhoto {
  url: string;
  isPrimary: boolean;
  moderationStatus?: string;
  order?: number;
  uploadedAt?: string;
}

export interface PremiumFeatures {
  unlimitedSwipes: boolean;
  seeWhoLikedYou: boolean;
  audioVideoCalls: boolean;
  priorityListing: boolean;
}

export interface User {
  id?: string;
  accountId: string;
  username: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  relationshipIntent: 'casual' | 'long_term' | 'hookups' | 'friendship' | 'unsure' | null;
  interestedIn: string[];
  matchRadiusKm: number;
  interests: string[];
  location: UserLocation | null;
  photos: UserPhoto[];
  isVerified: boolean;
  premiumStatus: 'free' | 'premium';
  premiumExpiresAt: any | null;
  premiumFeatures: PremiumFeatures;
  createdAt: any;
  lastActiveAt: any;
}

// ==========================================
// MATCHES COLLECTION
// ==========================================
export interface Match {
  id?: string;
  userA: string;
  userB: string;
  isActive: boolean;
  createdAt: any;
}

// ==========================================
// CHATS COLLECTION
// ==========================================
export interface LastMessage {
  text: string;
  senderId: string;
  timestamp: any;
}

export interface DeletionPolicy {
  type: 'rolling' | 'on_unmatch' | 'none';
  days: number | null;
}

export interface Chat {
  id?: string;
  type: 'dating' | 'event' | 'custom';
  participants: string[];
  relatedMatchId: string | null;
  isMutual: boolean;
  lastMessage: LastMessage | null;
  relatedEventId: string | null;
  deletionPolicy: DeletionPolicy;
  allowDeleteForEveryone: boolean;
  deleteForEveryoneWindowDays: number | null;
  createdAt: any;
  lastMessageAt: any;
}

// ==========================================
// MESSAGES COLLECTION
// ==========================================
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'gif' | 'sticker' | 'shadow_chip';

export interface Message {
  id?: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string;
  reactions: Record<string, string>; // userId -> emoji
  deletedForEveryone: boolean;
  deletedForEveryoneAt: any | null;
  deletedForEveryoneBy: string | null;
  deletedForUsers: string[];
  createdAt: any;
}

// ==========================================
// LIKER TYPE (for useLikers hook)
// ==========================================
export interface Liker {
  id: string;
  swipeId: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  interests: string[];
  relationshipIntent: string | null;
  interestedIn: string[];
  photos: UserPhoto[];
  location: UserLocation | null;
  isVerified: boolean;
  matchScore: number;
  distance: number | null;
  lastActiveAt: any;
  likedAt: any; // When they liked the current user
}
