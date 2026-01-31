/**
 * PROFILE SCREEN
 * 
 * User's complete profile with:
 * - Profile photo with completion % ring
 * - Editable fields (username, bio, interests, preferences, radius)
 * - Non-editable fields (name, age, gender)
 * - Enable location button
 * - Logout functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  StatusBar,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Modal,
  FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Circle } from 'react-native-svg';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import Geolocation from '@react-native-community/geolocation';
import Slider from '@react-native-community/slider';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { calculateProfileCompleteness, getMissingFields } from '../../utils/profileCompleteness';

type RelationshipIntent = 'casual' | 'long_term' | 'hookups' | 'friendship' | 'unsure';
type Gender = 'male' | 'female' | 'trans' | 'non_binary';

const RELATIONSHIP_OPTIONS: { value: RelationshipIntent; label: string; icon: string }[] = [
  { value: 'long_term', label: 'Long-term', icon: 'heart' },
  { value: 'casual', label: 'Casual', icon: 'cafe' },
  { value: 'friendship', label: 'Friendship', icon: 'people' },
  { value: 'hookups', label: 'Hookups', icon: 'flame' },
  { value: 'unsure', label: 'Unsure', icon: 'help-circle' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'trans', label: 'Trans' },
  { value: 'non_binary', label: 'Non-binary' },
];

// Height options in cm (4'8" to 7'0")
const HEIGHT_OPTIONS = [
  { cm: 142, label: "4'8\" (142 cm)" },
  { cm: 145, label: "4'9\" (145 cm)" },
  { cm: 147, label: "4'10\" (147 cm)" },
  { cm: 150, label: "4'11\" (150 cm)" },
  { cm: 152, label: "5'0\" (152 cm)" },
  { cm: 155, label: "5'1\" (155 cm)" },
  { cm: 157, label: "5'2\" (157 cm)" },
  { cm: 160, label: "5'3\" (160 cm)" },
  { cm: 163, label: "5'4\" (163 cm)" },
  { cm: 165, label: "5'5\" (165 cm)" },
  { cm: 168, label: "5'6\" (168 cm)" },
  { cm: 170, label: "5'7\" (170 cm)" },
  { cm: 173, label: "5'8\" (173 cm)" },
  { cm: 175, label: "5'9\" (175 cm)" },
  { cm: 178, label: "5'10\" (178 cm)" },
  { cm: 180, label: "5'11\" (180 cm)" },
  { cm: 183, label: "6'0\" (183 cm)" },
  { cm: 185, label: "6'1\" (185 cm)" },
  { cm: 188, label: "6'2\" (188 cm)" },
  { cm: 191, label: "6'3\" (191 cm)" },
  { cm: 193, label: "6'4\" (193 cm)" },
  { cm: 196, label: "6'5\" (196 cm)" },
  { cm: 198, label: "6'6\" (198 cm)" },
  { cm: 201, label: "6'7\" (201 cm)" },
  { cm: 203, label: "6'8\" (203 cm)" },
  { cm: 206, label: "6'9\" (206 cm)" },
  { cm: 208, label: "6'10\" (208 cm)" },
  { cm: 211, label: "6'11\" (211 cm)" },
  { cm: 213, label: "7'0\" (213 cm)" },
];

// Occupation suggestions for autocomplete
const OCCUPATION_SUGGESTIONS = [
  'Software Engineer', 'Doctor', 'Nurse', 'Teacher', 'Professor',
  'Lawyer', 'Accountant', 'Marketing Manager', 'Data Analyst', 'Designer',
  'Product Manager', 'Consultant', 'Entrepreneur', 'Student', 'Researcher',
  'Engineer', 'Architect', 'Photographer', 'Writer', 'Artist',
  'Chef', 'Pilot', 'Flight Attendant', 'HR Manager', 'Sales Manager',
  'Business Analyst', 'Financial Analyst', 'Investment Banker', 'Trader', 'Real Estate Agent',
  'Dentist', 'Pharmacist', 'Physiotherapist', 'Psychologist', 'Veterinarian',
  'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Chemical Engineer',
  'Content Creator', 'Influencer', 'Journalist', 'Editor', 'Filmmaker',
  'Fashion Designer', 'Interior Designer', 'Graphic Designer', 'UX Designer', 'UI Designer',
  'Personal Trainer', 'Yoga Instructor', 'Life Coach', 'Counselor',
  'Police Officer', 'Military', 'Firefighter', 'Government Employee',
  'Banker', 'Insurance Agent', 'Travel Agent', 'Event Planner',
  'CA', 'CS', 'MBA', 'PhD Student', 'Medical Student', 'Law Student',
];

/**
 * Convert cm to feet/inches string
 */
const cmToFeetInches = (cm: number): string => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
};

// Interest categories (matching signup)
const INTEREST_CATEGORIES = [
  {
    id: 'movies_tv',
    name: 'Movies & TV',
    icon: 'film-outline',
    tags: [
      'Action Movies', 'Comedy', 'Drama', 'Sci-Fi', 'Horror',
      'Romantic Comedies', 'Documentaries', 'Anime', 'Thriller',
      'Marvel', 'DC', 'Netflix', 'Stand-up Comedy', 'Reality TV',
    ],
  },
  {
    id: 'music',
    name: 'Music',
    icon: 'musical-notes-outline',
    tags: [
      'Pop', 'Rock', 'Hip Hop', 'EDM', 'Jazz', 'Classical',
      'Country', 'R&B', 'Indie', 'K-Pop', 'Metal', 'Live Music',
      'Concerts', 'Music Festivals', 'Playing Instruments',
    ],
  },
  {
    id: 'sports',
    name: 'Sports & Fitness',
    icon: 'football-outline',
    tags: [
      'Football', 'Cricket', 'Basketball', 'Tennis', 'Badminton',
      'Swimming', 'Yoga', 'Gym', 'Running', 'Cycling', 'Hiking',
      'Boxing', 'Dancing', 'Rock Climbing', 'Martial Arts',
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: 'restaurant-outline',
    tags: [
      'Cooking', 'Baking', 'Coffee', 'Wine', 'Craft Beer',
      'Street Food', 'Fine Dining', 'Vegan', 'Italian Food',
      'Asian Cuisine', 'Pizza', 'Desserts', 'Food Trucks', 'BBQ',
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Adventure',
    icon: 'airplane-outline',
    tags: [
      'Beach Vacations', 'Mountain Trips', 'Road Trips', 'Backpacking',
      'Luxury Travel', 'Solo Travel', 'City Breaks', 'Camping',
      'Photography', 'Adventure Sports', 'Cultural Tours', 'Cruises',
    ],
  },
  {
    id: 'hobbies',
    name: 'Hobbies & Interests',
    icon: 'color-palette-outline',
    tags: [
      'Photography', 'Painting', 'Drawing', 'Writing', 'Reading',
      'Gaming', 'Board Games', 'Puzzles', 'Collecting', 'DIY',
      'Gardening', 'Astronomy', 'Chess', 'Magic Tricks',
    ],
  },
  {
    id: 'arts',
    name: 'Arts & Culture',
    icon: 'brush-outline',
    tags: [
      'Museums', 'Art Galleries', 'Theater', 'Opera', 'Ballet',
      'Poetry', 'Literature', 'History', 'Philosophy', 'Design',
      'Architecture', 'Fashion', 'Vintage Shopping',
    ],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    icon: 'leaf-outline',
    tags: [
      'Meditation', 'Spirituality', 'Sustainability', 'Volunteering',
      'Activism', 'Minimalism', 'Wellness', 'Self-improvement',
      'Podcasts', 'Learning Languages', 'Entrepreneurship',
    ],
  },
  {
    id: 'tech',
    name: 'Technology',
    icon: 'phone-portrait-outline',
    tags: [
      'Coding', 'AI & ML', 'Cryptocurrency', 'Virtual Reality',
      'Gadgets', 'Robotics', 'Space Exploration', 'Science',
    ],
  },
  {
    id: 'social',
    name: 'Social & Nightlife',
    icon: 'people-outline',
    tags: [
      'Partying', 'Clubbing', 'Karaoke', 'Brunch', 'Happy Hour',
      'Festivals', 'Social Events', 'Networking', 'Comedy Shows',
    ],
  },
];

const ProfileScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [completeness, setCompleteness] = useState(0);

  // Editable fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [relationshipIntent, setRelationshipIntent] = useState<RelationshipIntent | null>(null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [matchRadiusKm, setMatchRadiusKm] = useState(25);
  
  // New fields
  const [height, setHeight] = useState<number | null>(null);
  const [heightDisplayUnit, setHeightDisplayUnit] = useState<'cm' | 'ft'>('ft');
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [filteredOccupations, setFilteredOccupations] = useState<string[]>([]);
  const [showOccupationSuggestions, setShowOccupationSuggestions] = useState(false);
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');

  const [editMode, setEditMode] = useState<string | null>(null); // 'bio', 'interests', etc.
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [tempInterests, setTempInterests] = useState<string[]>([]);

  const userId = auth().currentUser?.uid;

  /**
   * Fetch user data
   */
  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await firestore().collection('users').doc(userId).get();
        const data = userDoc.data();

        if (data) {
          setUserData(data);
          setName(data.name || '');
          setUsername(data.username || '');
          setBio(data.bio || '');
          setInterests(data.interests || []);
          setRelationshipIntent(data.relationshipIntent || null);
          setInterestedIn(data.interestedIn || []);
          setMatchRadiusKm(data.matchRadiusKm || 25);
          
          // Load new fields
          setHeight(data.height?.value || null);
          setHeightDisplayUnit(data.height?.displayUnit || 'ft');
          setOccupation(data.occupation || '');
          setInstagram(data.socialHandles?.instagram || '');
          setLinkedin(data.socialHandles?.linkedin || '');
          setFacebook(data.socialHandles?.facebook || '');
          setTwitter(data.socialHandles?.twitter || '');

          // Calculate completeness
          const percent = calculateProfileCompleteness(data);
          setCompleteness(percent);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  /**
   * Refresh profile data and recalculate completeness
   */
  const refreshProfileData = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Check current location permission
      const hasLocationPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      // Fetch fresh user data from Firestore
      const userDoc = await firestore().collection('users').doc(userId).get();
      const data = userDoc.data();

      if (data) {
        // If permission was revoked, clear location from Firestore
        if (!hasLocationPermission && data.location) {
          await firestore()
            .collection('users')
            .doc(userId)
            .update({ location: null });
          data.location = null;
        }

        setUserData(data);
        setUsername(data.username || '');
        setBio(data.bio || '');
        setInterests(data.interests || []);
        setRelationshipIntent(data.relationshipIntent || null);
        setInterestedIn(data.interestedIn || []);
        setMatchRadiusKm(data.matchRadiusKm || 25);
        
        // Load new fields on refresh
        setHeight(data.height?.value || null);
        setHeightDisplayUnit(data.height?.displayUnit || 'ft');
        setOccupation(data.occupation || '');
        setInstagram(data.socialHandles?.instagram || '');
        setLinkedin(data.socialHandles?.linkedin || '');
        setFacebook(data.socialHandles?.facebook || '');
        setTwitter(data.socialHandles?.twitter || '');

        // Recalculate completeness with current data
        const percent = calculateProfileCompleteness(data);
        setCompleteness(percent);
      }
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    }
  }, [userId]);

  /**
   * Refresh on screen focus (e.g., returning from Settings)
   */
  useFocusEffect(
    useCallback(() => {
      refreshProfileData();
    }, [refreshProfileData])
  );

  /**
   * Refresh when app returns from background (e.g., after changing permissions in Settings)
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshProfileData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refreshProfileData]);

  /**
   * Save profile changes
   */
  const handleSave = async () => {
    // Validate name - cannot be empty
    if (editMode === 'name') {
      if (!name.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Name Required',
          text2: 'Full name cannot be empty',
          visibilityTime: 3000,
        });
        return;
      }
    }

    // Validation for interests
    if (editMode === 'interests') {
      if (tempInterests.length > 0 && tempInterests.length < 5) {
        Toast.show({
          type: 'error',
          text1: 'Select More Interests',
          text2: `You must select at least 5 interests or none (${tempInterests.length}/5)`,
          visibilityTime: 3000,
        });
        return;
      }
    }

    setSaving(true);

    try {
      if (!userId) throw new Error('User not authenticated');

      const updateData: any = {};

      if (editMode === 'name') updateData.name = name.trim();
      if (editMode === 'username') updateData.username = username;
      if (editMode === 'bio') updateData.bio = bio;
      if (editMode === 'interests') updateData.interests = tempInterests;
      if (editMode === 'intent') updateData.relationshipIntent = relationshipIntent;
      if (editMode === 'gender') updateData.interestedIn = interestedIn;
      if (editMode === 'radius') updateData.matchRadiusKm = matchRadiusKm;
      if (editMode === 'height') updateData.height = height ? { value: height, displayUnit: heightDisplayUnit } : null;
      if (editMode === 'occupation') updateData.occupation = occupation.trim() || null;
      if (editMode === 'social') updateData.socialHandles = (instagram || linkedin || facebook || twitter) ? {
        instagram: instagram.trim() || null,
        linkedin: linkedin.trim() || null,
        facebook: facebook.trim() || null,
        twitter: twitter.trim() || null,
      } : null;

      await firestore()
        .collection('users')
        .doc(userId)
        .update(updateData);

      // Update local state
      if (editMode === 'interests') {
        setInterests(tempInterests);
      }

      // Recalculate completeness
      const updatedData = {
        ...userData,
        name: editMode === 'name' ? name.trim() : userData.name,
        username,
        bio,
        interests: editMode === 'interests' ? tempInterests : interests,
        relationshipIntent,
        interestedIn,
        matchRadiusKm,
      };
      const percent = calculateProfileCompleteness(updatedData);
      setCompleteness(percent);
      setUserData(updatedData);

      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your changes have been saved',
        visibilityTime: 2000,
      });

      setEditMode(null);
      setExpandedCategory(null);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: error.message || 'Could not save changes',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Request location permission
   */
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // First check if permission is already granted
        const checkResult = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (checkResult) {
          console.log('Location permission already granted');
          return true;
        }

        // Request permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Funmate needs access to your location to find matches nearby',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        console.log('Permission request result:', granted);
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Permission Required',
            'Location permission was denied. Please enable it in Settings > Apps > Funmate > Permissions > Location',
            [{ text: 'OK' }]
          );
          return false;
        } else {
          return false;
        }
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  /**
   * Get current location coordinates
   */
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      // Try network-based location first (WiFi/cell towers) - works indoors
      console.log('Attempting to get location (network-based)...');
      
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location obtained:', position.coords);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('❌ Location error:', error);
          // If network location fails, show user-friendly error
          resolve(null);
        },
        { 
          enableHighAccuracy: false,  // Use network location (WiFi/cell) - faster, works indoors
          timeout: 15000,              // 15 seconds timeout
          maximumAge: 300000           // Accept location up to 5 minutes old
        }
      );
    });
  };

  /**
   * Enable location
   */
  const handleEnableLocation = async () => {
    try {
      console.log('🔍 Starting location enable flow...');
      
      const hasPermission = await requestLocationPermission();
      
      console.log('Permission result:', hasPermission);
      
      if (!hasPermission) {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Location access is required for better matches',
          visibilityTime: 3000,
        });
        return;
      }

      console.log('✅ Permission granted, getting location...');

      Toast.show({
        type: 'info',
        text1: 'Getting Location...',
        text2: 'Using WiFi and cell towers',
        visibilityTime: 3000,
      });

      const coords = await getCurrentLocation();
      
      if (!coords) {
        Alert.alert(
          'Location Unavailable',
          'Could not get your location. Please ensure Location/GPS is enabled in your device settings.\n\nGo to: Settings > Location > Turn ON',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ Location obtained, saving to Firestore...');

      // Save location to Firestore
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        });

      console.log('✅ Location saved successfully');

      // Update local state
      const updatedData = {
        ...userData,
        location: coords,
      };
      setUserData(updatedData);
      const percent = calculateProfileCompleteness(updatedData);
      setCompleteness(percent);

      Toast.show({
        type: 'success',
        text1: 'Location Enabled! 📍',
        text2: 'You\'ll now see matches nearby',
        visibilityTime: 2000,
      });

    } catch (error: any) {
      console.error('❌ Error enabling location:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Could not enable location',
        visibilityTime: 3000,
      });
    }
  };

  /**
   * Logout
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth().signOut();
              
              // Reset navigation stack to Login
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
              
              Toast.show({
                type: 'success',
                text1: 'Logged Out',
                text2: 'See you soon!',
                visibilityTime: 2000,
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  /**
   * Toggle interest
   */
  const toggleInterest = (interest: string) => {
    if (tempInterests.includes(interest)) {
      setTempInterests(prev => prev.filter(i => i !== interest));
    } else {
      if (tempInterests.length >= 15) {
        Toast.show({
          type: 'error',
          text1: 'Maximum Reached',
          text2: 'You can select up to 15 interests',
          visibilityTime: 2000,
        });
        return;
      }
      setTempInterests(prev => [...prev, interest]);
    }
  };

  /**
   * Toggle gender preference
   */
  const toggleGenderPreference = (gender: Gender) => {
    if (interestedIn.includes(gender)) {
      setInterestedIn(prev => prev.filter(g => g !== gender));
    } else {
      setInterestedIn(prev => [...prev, gender]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No profile data found</Text>
      </View>
    );
  }

  const primaryPhoto = userData.photos?.find((p: any) => p.isPrimary)?.url || 
                       userData.photos?.[0]?.url || 
                       'https://via.placeholder.com/150';

  const missingFields = getMissingFields(userData);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={120}
        extraHeight={180}
        keyboardOpeningTime={0}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#FF4458" />
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => (navigation as any).navigate('NotificationSettings')}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="notifications-outline" size={22} color="#666" />
              <Text style={styles.settingsItemText}>Notification Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => (navigation as any).navigate('BlockedUsers')}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="ban-outline" size={22} color="#666" />
              <Text style={styles.settingsItemText}>Blocked Users</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Profile Photo with Completion Ring */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            <Svg width={140} height={140} style={styles.progressRing}>
              <Circle
                cx="70"
                cy="70"
                r="65"
                stroke="#E0E0E0"
                strokeWidth="6"
                fill="none"
              />
              <Circle
                cx="70"
                cy="70"
                r="65"
                stroke="#FF4458"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 65}`}
                strokeDashoffset={`${2 * Math.PI * 65 * (1 - completeness / 100)}`}
                strokeLinecap="round"
                rotation="-90"
                origin="70, 70"
              />
            </Svg>
            <Image source={{ uri: primaryPhoto }} style={styles.profilePhoto} />
          </View>
          <Text style={styles.completenessText}>{completeness}% Complete</Text>
          {missingFields.length > 0 && (
            <Text style={styles.missingText}>
              Add: {missingFields.join(', ')}
            </Text>
          )}
        </View>

        {/* Non-Editable Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#666666" />
            <View style={styles.infoContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.infoLabel}>Full Name</Text>
                {editMode === 'name' ? (
                  <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveButton}>Save</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setEditMode('name')}>
                    <Ionicons name="create-outline" size={20} color="#FF4458" />
                  </TouchableOpacity>
                )}
              </View>
              {editMode === 'name' ? (
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  autoFocus
                />
              ) : (
                <Text style={styles.infoValue}>{userData.name}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{userData.age} years old</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name={userData.gender === 'male' ? 'male' : 'female'} size={20} color="#666666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{userData.gender}</Text>
            </View>
          </View>
        </View>

        {/* Username (Editable) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Username</Text>
            {editMode === 'username' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('username')}>
                <Ionicons name="create-outline" size={20} color="#FF4458" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'username' ? (
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              autoFocus
            />
          ) : (
            <Text style={styles.displayValue}>@{username || 'Not set'}</Text>
          )}
        </View>

        {/* Bio (Editable) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bio</Text>
            {editMode === 'bio' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('bio')}>
                <Ionicons name="create-outline" size={20} color="#FF4458" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'bio' ? (
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself (min 20 characters)"
              multiline
              maxLength={500}
              autoFocus
            />
          ) : (
            <Text style={styles.displayValue}>{bio || 'No bio yet'}</Text>
          )}
        </View>

        {/* Interests (Editable - Full Section Like Signup) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Interests</Text>
            {editMode === 'interests' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={() => {
                  setTempInterests(interests);
                  setEditMode('interests');
                }}
              >
                <Ionicons name="create-outline" size={20} color="#FF4458" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'interests' ? (
            <>
              {/* Interest Count */}
              <View style={styles.interestCount}>
                <Text style={styles.countText}>
                  {tempInterests.length} / 15 selected
                </Text>
                <Text style={[
                  styles.minText,
                  tempInterests.length >= 5 && styles.minTextSuccess
                ]}>
                  {tempInterests.length >= 5 ? '✓ Minimum met' : tempInterests.length === 0 ? 'Min: 5 or none' : `Min: 5 (${tempInterests.length}/5)`}
                </Text>
              </View>

              {/* Selected Chips */}
              {tempInterests.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.selectedChipsScroll}
                  contentContainerStyle={styles.selectedChipsContainer}
                >
                  {tempInterests.map((interest) => (
                    <TouchableOpacity
                      key={interest}
                      style={styles.selectedChip}
                      onPress={() => toggleInterest(interest)}
                    >
                      <Text style={styles.selectedChipText}>{interest}</Text>
                      <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Categories */}
              {INTEREST_CATEGORIES.map((category) => (
                <View key={category.id} style={styles.categoryContainer}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => setExpandedCategory(
                      expandedCategory === category.id ? null : category.id
                    )}
                  >
                    <View style={styles.categoryTitleRow}>
                      <Ionicons name={category.icon as any} size={22} color="#FF4458" />
                      <Text style={styles.categoryTitle}>{category.name}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {category.tags.filter(tag => tempInterests.includes(tag)).length}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={expandedCategory === category.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#666666"
                    />
                  </TouchableOpacity>

                  {expandedCategory === category.id && (
                    <View style={styles.tagsContainer}>
                      {category.tags.map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            styles.interestTag,
                            tempInterests.includes(tag) && styles.interestTagSelected,
                          ]}
                          onPress={() => toggleInterest(tag)}
                        >
                          <Text
                            style={[
                              styles.interestTagText,
                              tempInterests.includes(tag) && styles.interestTagTextSelected,
                            ]}
                          >
                            {tag}
                          </Text>
                          {tempInterests.includes(tag) && (
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </>
          ) : (
            <View style={styles.interestsDisplay}>
              {interests.length > 0 ? (
                interests.map((interest, i) => (
                  <View key={i} style={styles.interestDisplayTag}>
                    <Text style={styles.interestDisplayTagText}>{interest}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.displayValue}>No interests selected</Text>
              )}
            </View>
          )}
        </View>

        {/* Relationship Intent (Editable) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Looking For</Text>
            {editMode === 'intent' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('intent')}>
                <Ionicons name="create-outline" size={20} color="#FF4458" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'intent' ? (
            <View style={styles.optionsGrid}>
              {RELATIONSHIP_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    relationshipIntent === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setRelationshipIntent(option.value)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={relationshipIntent === option.value ? '#FFFFFF' : '#666666'}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      relationshipIntent === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.displayValue}>
              {RELATIONSHIP_OPTIONS.find(o => o.value === relationshipIntent)?.label || 'Not set'}
            </Text>
          )}
        </View>

        {/* Gender Preference (Editable) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Interested In</Text>
            {editMode === 'gender' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('gender')}>
                <Ionicons name="create-outline" size={20} color="#FF4458" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'gender' ? (
            <View style={styles.optionsGrid}>
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    interestedIn.includes(option.value) && styles.optionButtonSelected,
                  ]}
                  onPress={() => toggleGenderPreference(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      interestedIn.includes(option.value) && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.displayValue}>
              {interestedIn.length > 0 ? GENDER_OPTIONS.filter(o => interestedIn.includes(o.value)).map(o => o.label).join(', ') : 'Not set'}
            </Text>
          )}
        </View>

        {/* Height (Editable) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Height</Text>
            {editMode === 'height' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('height')}>
                <Ionicons name="create-outline" size={20} color="#FF4458" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'height' ? (
            <View style={styles.heightInputWrapper}>
              <Ionicons name="resize-outline" size={22} color="#FF4458" style={styles.heightIcon} />
              <TextInput
                style={styles.heightInput}
                placeholder="Enter height in cm"
                value={height ? height.toString() : ''}
                onChangeText={(text) => {
                  const numValue = parseInt(text);
                  if (text === '') {
                    setHeight(null);
                  } else if (!isNaN(numValue) && numValue > 0 && numValue <= 300) {
                    setHeight(numValue);
                  }
                }}
                keyboardType="numeric"
                maxLength={3}
                autoFocus
              />
              <Text style={styles.heightUnit}>cm</Text>
            </View>
          ) : (
            <Text style={styles.displayValue}>
              {height ? `${height} cm` : 'Not set'}
            </Text>
          )}
        </View>

        {/* Occupation (Editable) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Occupation</Text>
            {editMode === 'occupation' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('occupation')}>
                <Ionicons name="create-outline" size={20} color="#FF4458" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'occupation' ? (
            <View>
              <TextInput
                style={styles.input}
                value={occupation}
                onChangeText={(text) => {
                  setOccupation(text);
                  if (text.length >= 2) {
                    const filtered = OCCUPATION_SUGGESTIONS.filter(occ =>
                      occ.toLowerCase().includes(text.toLowerCase())
                    );
                    setFilteredOccupations(filtered.slice(0, 5));
                  } else {
                    setFilteredOccupations([]);
                  }
                }}
                placeholder="e.g., Software Engineer, Doctor, Student..."
                maxLength={50}
                autoFocus
              />
              
              {/* Suggestions as simple list below input */}
              {filteredOccupations.length > 0 && occupation.length >= 2 && (
                <View style={styles.suggestionsList}>
                  {filteredOccupations.map((occ, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItemInline}
                      onPress={() => {
                        setOccupation(occ);
                        setFilteredOccupations([]);
                      }}
                    >
                      <Text style={styles.suggestionTextInline}>{occ}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.displayValue}>{occupation || 'Not set'}</Text>
          )}
        </View>

        {/* Social Handles (Editable) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Social Handles</Text>
            {editMode === 'social' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('social')}>
                <Ionicons name="create-outline" size={20} color="#FF4458" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'social' ? (
            <View style={styles.socialEditContainer}>
              <View style={styles.socialInputRow}>
                <Ionicons name="logo-instagram" size={22} color="#E4405F" />
                <TextInput
                  style={styles.socialInput}
                  value={instagram}
                  onChangeText={setInstagram}
                  placeholder="@username"
                  autoCapitalize="none"
                  maxLength={30}
                />
              </View>
              <View style={styles.socialInputRow}>
                <Ionicons name="logo-linkedin" size={22} color="#0A66C2" />
                <TextInput
                  style={styles.socialInput}
                  value={linkedin}
                  onChangeText={setLinkedin}
                  placeholder="Profile URL or username"
                  autoCapitalize="none"
                  maxLength={100}
                />
              </View>
              <View style={styles.socialInputRow}>
                <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                <TextInput
                  style={styles.socialInput}
                  value={facebook}
                  onChangeText={setFacebook}
                  placeholder="Profile URL or username"
                  autoCapitalize="none"
                  maxLength={100}
                />
              </View>
              <View style={styles.socialInputRow}>
                <Text style={styles.xLogoSmall}>𝕏</Text>
                <TextInput
                  style={styles.socialInput}
                  value={twitter}
                  onChangeText={setTwitter}
                  placeholder="@username"
                  autoCapitalize="none"
                  maxLength={30}
                />
              </View>
            </View>
          ) : (
            <View style={styles.socialDisplayContainer}>
              {instagram && (
                <View style={styles.socialDisplayRow}>
                  <Ionicons name="logo-instagram" size={18} color="#E4405F" />
                  <Text style={styles.socialDisplayText}>@{instagram.replace('@', '')}</Text>
                </View>
              )}
              {linkedin && (
                <View style={styles.socialDisplayRow}>
                  <Ionicons name="logo-linkedin" size={18} color="#0A66C2" />
                  <Text style={styles.socialDisplayText}>{linkedin}</Text>
                </View>
              )}
              {facebook && (
                <View style={styles.socialDisplayRow}>
                  <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                  <Text style={styles.socialDisplayText}>{facebook}</Text>
                </View>
              )}
              {twitter && (
                <View style={styles.socialDisplayRow}>
                  <Text style={styles.xLogoDisplay}>𝕏</Text>
                  <Text style={styles.socialDisplayText}>@{twitter.replace('@', '')}</Text>
                </View>
              )}
              {!instagram && !linkedin && !facebook && !twitter && (
                <Text style={styles.displayValue}>Not set</Text>
              )}
            </View>
          )}
        </View>

        {/* Match Radius (Editable) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Match Radius: {matchRadiusKm} km</Text>
            {editMode === 'radius' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('radius')}>
                <Ionicons name="create-outline" size={20} color="#FF4458" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'radius' && (
            <Slider
              style={styles.slider}
              minimumValue={5}
              maximumValue={100}
              step={5}
              value={matchRadiusKm}
              onValueChange={setMatchRadiusKm}
              minimumTrackTintColor="#FF4458"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#FF4458"
            />
          )}
        </View>

        <View style={{ height: 100 }} />
      </KeyboardAwareScrollView>

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
  errorText: {
    fontSize: 16,
    color: '#666666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  logoutButton: {
    padding: 8,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
  },
  photoContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    marginBottom: 12,
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'absolute',
    top: 10,
    left: 10,
  },
  completenessText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF4458',
    marginBottom: 4,
  },
  missingText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  saveButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4458',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1A1A1A',
    textTransform: 'capitalize',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  displayValue: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 24,
  },
  // Interests Section - Matching Signup Design
  interestCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 12,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4458',
  },
  minText: {
    fontSize: 14,
    color: '#999999',
  },
  minTextSuccess: {
    color: '#4CAF50',
  },
  selectedChipsScroll: {
    marginBottom: 12,
  },
  selectedChipsContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FF4458',
  },
  selectedChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryContainer: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#FF4458',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  interestTagSelected: {
    backgroundColor: '#FF4458',
    borderColor: '#FF4458',
  },
  interestTagText: {
    fontSize: 14,
    color: '#666666',
  },
  interestTagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  interestsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestDisplayTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  interestDisplayTagText: {
    fontSize: 14,
    color: '#666666',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  interestChipSelected: {
    backgroundColor: '#FF4458',
    borderColor: '#FF4458',
  },
  interestChipText: {
    fontSize: 14,
    color: '#666666',
  },
  interestChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionButtonSelected: {
    backgroundColor: '#FF4458',
    borderColor: '#FF4458',
  },
  optionText: {
    fontSize: 14,
    color: '#666666',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
  },
  // Location Section - Improved Layout
  locationHeader: {
    marginBottom: 12,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  locationStatus: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  locationDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  enableLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4458',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  enableLocationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Settings Section
  settingsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsItemText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  // Height Edit Styles
  heightInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 14,
  },
  heightIcon: {
    marginRight: 12,
  },
  heightInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    paddingVertical: 14,
  },
  heightUnit: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Social Edit Styles
  socialEditContainer: {
    marginTop: 8,
    gap: 12,
  },
  socialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialInput: {
    flex: 1,
    padding: 14,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    fontSize: 15,
    color: '#1A1A1A',
  },
  xLogoSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  socialDisplayContainer: {
    marginTop: 4,
  },
  socialDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  socialDisplayText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  xLogoDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  // Occupation autocomplete styles - inline list (not absolute positioned)
  suggestionsList: {
    marginTop: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  suggestionItemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  suggestionTextInline: {
    fontSize: 15,
    color: '#1A1A1A',
  },
});

export default ProfileScreen;
