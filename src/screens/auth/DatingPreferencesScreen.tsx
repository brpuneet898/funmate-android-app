/**
 * Dating Preferences Screen
 * 
 * Final profile setup screen where users set:
 * - Bio (about me)
 * - Height
 * - Occupation
 * - Relationship intent (what they're looking for)
 * - Interested in (gender preferences)
 * - Match radius (distance)
 * - Social handles (Instagram, LinkedIn, Facebook, X)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  PermissionsAndroid,
  Platform,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Slider from '@react-native-community/slider';
import Geolocation from '@react-native-community/geolocation';
import { SocialHandles } from '../../types/database';
import notificationService from '../../services/NotificationService';

interface DatingPreferencesScreenProps {
  navigation: any;
}

type RelationshipIntent = 'casual' | 'long_term' | 'hookups' | 'friendship' | 'unsure';
type Gender = 'male' | 'female' | 'trans' | 'non_binary';

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

const RELATIONSHIP_OPTIONS: { value: RelationshipIntent; label: string; icon: string; description: string }[] = [
  { value: 'long_term', label: 'Long-term', icon: 'heart', description: 'Looking for a relationship' },
  { value: 'casual', label: 'Casual', icon: 'cafe', description: 'Something relaxed' },
  { value: 'friendship', label: 'Friendship', icon: 'people', description: 'New friends' },
  { value: 'hookups', label: 'Hookups', icon: 'flame', description: 'Keeping it casual' },
  { value: 'unsure', label: 'Unsure', icon: 'help-circle', description: 'Still figuring it out' },
];

const GENDER_OPTIONS: { value: Gender; label: string; icon: string }[] = [
  { value: 'male', label: 'Men', icon: 'male' },
  { value: 'female', label: 'Women', icon: 'female' },
  { value: 'trans', label: 'Trans', icon: 'transgender' },
  { value: 'non_binary', label: 'Non-binary', icon: 'male-female' },
];

// Common occupations for autocomplete suggestions
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

const DatingPreferencesScreen: React.FC<DatingPreferencesScreenProps> = ({ navigation }) => {
  const [bio, setBio] = useState('');
  const [height, setHeight] = useState<number | null>(null);
  const [heightDisplayUnit, setHeightDisplayUnit] = useState<'cm' | 'ft'>('ft');
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [showOccupationSuggestions, setShowOccupationSuggestions] = useState(false);
  const [filteredOccupations, setFilteredOccupations] = useState<string[]>([]);
  const [relationshipIntent, setRelationshipIntent] = useState<RelationshipIntent | null>(null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [matchRadiusKm, setMatchRadiusKm] = useState(25);
  
  // Social handles
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  /**
   * Handle occupation input change with autocomplete
   */
  const handleOccupationChange = (text: string) => {
    setOccupation(text);
    if (text.length >= 2) {
      const filtered = OCCUPATION_SUGGESTIONS.filter(occ => 
        occ.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredOccupations(filtered.slice(0, 5));
      setShowOccupationSuggestions(filtered.length > 0);
    } else {
      setShowOccupationSuggestions(false);
    }
  };

  /**
   * Convert cm to feet/inches string
   */
  const cmToFeetInches = (cm: number): string => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  /**
   * Get height display string
   */
  const getHeightDisplay = (): string => {
    if (!height) return '';
    return `${height}`;
  };

  /**
   * Request location permission
   */
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
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
        const permitted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermissionGranted(permitted);
        return permitted;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  };

  /**
   * Get current location coordinates (with short timeout for better UX)
   */
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Location error (non-blocking):', error.message);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 } // Lower accuracy, faster response
      );
    });
  };

  const handleToggleGender = (gender: Gender) => {
    if (interestedIn.includes(gender)) {
      setInterestedIn(prev => prev.filter(g => g !== gender));
    } else {
      setInterestedIn(prev => [...prev, gender]);
    }
  };

  /**
   * Skip dating preferences - creates empty preference fields
   */
  const handleSkip = async () => {
    setSaving(true);

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Save empty preferences (for profile completion tracking)
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          bio: '',
          relationshipIntent: null,
          interestedIn: [],
          matchRadiusKm: 25, // Default value
        });

      console.log('✅ Dating preferences skipped - empty fields saved');

      Toast.show({
        type: 'success',
        text1: 'Profile Setup Complete! 🎉',
        text2: 'Welcome to Funmate',
        visibilityTime: 2000,
      });

      // Navigate to main app
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' as never }],
        });
      }, 1500);

    } catch (error: any) {
      console.error('❌ Error skipping preferences:', error);
      Toast.show({
        type: 'error',
        text1: 'Skip Failed',
        text2: error.message || 'Could not skip. Please try again.',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    // Validation - Bio is optional, but if user writes something, enforce minimum
    if (bio.trim().length > 0 && bio.trim().length < 20) {
      Toast.show({
        type: 'error',
        text1: 'Bio Too Short',
        text2: 'Please write at least 20 characters about yourself',
        visibilityTime: 3000,
      });
      return;
    }

    if (bio.trim().length > 500) {
      Toast.show({
        type: 'error',
        text1: 'Bio Too Long',
        text2: 'Please keep your bio under 500 characters',
        visibilityTime: 3000,
      });
      return;
    }

    // All other fields are optional - no validation needed

    setSaving(true);

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Build social handles object (null if all empty)
      const socialHandles: SocialHandles | null = (instagram || linkedin || facebook || twitter) ? {
        instagram: instagram.trim() || null,
        linkedin: linkedin.trim() || null,
        facebook: facebook.trim() || null,
        twitter: twitter.trim() || null,
      } : null;

      // Build height object (null if not selected)
      const heightData = height ? {
        value: height,
        displayUnit: heightDisplayUnit,
      } : null;

      // Save dating preferences immediately (don't wait for location)
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          bio: bio.trim() || null,
          height: heightData,
          occupation: occupation.trim() || null,
          socialHandles,
          relationshipIntent: relationshipIntent || null,
          interestedIn,
          matchRadiusKm,
        });

      console.log('✅ Dating preferences saved');

      // Initialize push notifications (user document now exists)
      // This will request permission and save FCM token
      notificationService.initialize().catch(err => 
        console.warn('Notification initialization failed:', err)
      );

      // Fetch location in background (non-blocking)
      requestLocationPermission().then(async (hasPermission) => {
        if (hasPermission) {
          const coords = await getCurrentLocation();
          if (coords && userId) {
            await firestore()
              .collection('users')
              .doc(userId)
              .update({
                location: {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                },
              });
            console.log('📍 Location updated in background:', coords);
          }
        }
      }).catch(err => console.warn('Background location fetch failed:', err));

      Toast.show({
        type: 'success',
        text1: 'Profile Complete! 🎉',
        text2: 'Welcome to Funmate',
        visibilityTime: 2000,
      });

      // Navigate to main app immediately
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' as never }],
        });
      }, 1000);

    } catch (error: any) {
      console.error('❌ Error saving preferences:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: error.message || 'Could not save preferences. Please try again.',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const bioCharCount = bio.length;
  // Bio is valid if empty OR has 20+ characters
  const bioValid = bioCharCount === 0 || (bioCharCount >= 20 && bioCharCount <= 500);
  // Show invalid state only when user has started typing but hasn't reached minimum
  const bioShowInvalid = bioCharCount > 0 && bioCharCount < 20;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={100}
        extraHeight={150}
        keyboardOpeningTime={0}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Almost Done!</Text>
            <Text style={styles.subtitle}>Complete your dating profile</Text>
          </View>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* About Me */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.sectionSubtitle}>Tell others what makes you unique</Text>
          
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="I love hiking, trying new restaurants, and binge-watching sci-fi shows..."
              placeholderTextColor="#999999"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={[
              styles.charCount,
              bioCharCount >= 20 ? styles.charCountValid : (bioShowInvalid ? styles.charCountInvalid : {})
            ]}>
              {bioCharCount}/500 {bioCharCount === 0 ? '(optional)' : (bioCharCount >= 20 ? '✓' : `(min 20)`)}
            </Text>
          </View>
        </View>

        {/* Height */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Height</Text>
          <Text style={styles.sectionSubtitle}>Optional but helps with matching</Text>
          
          <View style={styles.heightInputWrapper}>
            <Ionicons name="resize-outline" size={22} color="#FF4458" style={styles.heightIcon} />
            <TextInput
              style={styles.heightInput}
              placeholder="Enter height in cm"
              placeholderTextColor="#999999"
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
            />
            <Text style={styles.heightUnit}>cm</Text>
          </View>
        </View>

        {/* Occupation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Occupation</Text>
          <Text style={styles.sectionSubtitle}>What do you do?</Text>
          
          <View>
            <View style={styles.occupationInputWrapper}>
              <Ionicons name="briefcase-outline" size={22} color="#FF4458" style={styles.occupationIcon} />
              <TextInput
                style={styles.occupationInput}
                placeholder="e.g., Software Engineer, Doctor...."
                placeholderTextColor="#999999"
                value={occupation}
                onChangeText={handleOccupationChange}
                maxLength={50}
              />
            </View>
            
            {/* Suggestions as inline list below input */}
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
        </View>

        {/* Looking For */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Looking For</Text>
          <Text style={styles.sectionSubtitle}>What are you looking for?</Text>
          
          <View style={styles.optionsContainer}>
            {RELATIONSHIP_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.relationshipCard,
                  relationshipIntent === option.value && styles.relationshipCardSelected,
                ]}
                onPress={() => setRelationshipIntent(option.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon as any}
                  size={28}
                  color={relationshipIntent === option.value ? '#FFFFFF' : '#FF4458'}
                />
                <Text style={[
                  styles.relationshipLabel,
                  relationshipIntent === option.value && styles.relationshipLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.relationshipDescription,
                  relationshipIntent === option.value && styles.relationshipDescriptionSelected,
                ]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Interested In */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interested In</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          
          <View style={styles.genderContainer}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderChip,
                  interestedIn.includes(option.value) && styles.genderChipSelected,
                ]}
                onPress={() => handleToggleGender(option.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon as any}
                  size={22}
                  color={interestedIn.includes(option.value) ? '#FFFFFF' : '#FF4458'}
                />
                <Text style={[
                  styles.genderLabel,
                  interestedIn.includes(option.value) && styles.genderLabelSelected,
                ]}>
                  {option.label}
                </Text>
                {interestedIn.includes(option.value) && (
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Match Radius */}
        <View style={styles.section}>
          <View style={styles.radiusHeader}>
            <View>
              <Text style={styles.sectionTitle}>Match Radius</Text>
              <Text style={styles.sectionSubtitle}>How far should we look?</Text>
            </View>
            <View style={styles.radiusBadge}>
              <Text style={styles.radiusBadgeText}>{matchRadiusKm} km</Text>
            </View>
          </View>
          
          <View style={styles.sliderContainer}>
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
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>5 km</Text>
              <Text style={styles.sliderLabel}>100 km</Text>
            </View>
          </View>
        </View>

        {/* Social Handles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Handles</Text>
          <Text style={styles.sectionSubtitle}>Help others connect with you (optional)</Text>
          
          <View style={styles.socialHandlesContainer}>
            {/* Instagram */}
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconWrapper, { backgroundColor: '#E4405F' }]}>
                <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
              </View>
              <TextInput
                style={styles.socialInput}
                placeholder="@username"
                placeholderTextColor="#999999"
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
                maxLength={30}
              />
            </View>

            {/* LinkedIn */}
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconWrapper, { backgroundColor: '#0A66C2' }]}>
                <Ionicons name="logo-linkedin" size={18} color="#FFFFFF" />
              </View>
              <TextInput
                style={styles.socialInput}
                placeholder="Profile URL or username"
                placeholderTextColor="#999999"
                value={linkedin}
                onChangeText={setLinkedin}
                autoCapitalize="none"
                maxLength={100}
              />
            </View>

            {/* Facebook */}
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconWrapper, { backgroundColor: '#1877F2' }]}>
                <Ionicons name="logo-facebook" size={18} color="#FFFFFF" />
              </View>
              <TextInput
                style={styles.socialInput}
                placeholder="Profile URL or username"
                placeholderTextColor="#999999"
                value={facebook}
                onChangeText={setFacebook}
                autoCapitalize="none"
                maxLength={100}
              />
            </View>

            {/* X (Twitter) */}
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconWrapper, { backgroundColor: '#000000' }]}>
                <Text style={styles.xLogo}>𝕏</Text>
              </View>
              <TextInput
                style={styles.socialInput}
                placeholder="@username"
                placeholderTextColor="#999999"
                value={twitter}
                onChangeText={setTwitter}
                autoCapitalize="none"
                maxLength={30}
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>

      {/* Complete Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleComplete}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.completeButtonText}>
            {saving ? 'Completing...' : 'Complete Profile'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4458',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  textAreaContainer: {
    position: 'relative',
  },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  charCount: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
  },
  charCountValid: {
    color: '#4CAF50',
  },
  charCountInvalid: {
    color: '#FF6B6B',
  },
  optionsContainer: {
    gap: 12,
  },
  relationshipCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  relationshipCardSelected: {
    backgroundColor: '#FF4458',
    borderColor: '#FF4458',
  },
  relationshipLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  relationshipLabelSelected: {
    color: '#FFFFFF',
  },
  relationshipDescription: {
    fontSize: 13,
    color: '#666666',
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  relationshipDescriptionSelected: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 8,
    minWidth: 110,
  },
  genderChipSelected: {
    backgroundColor: '#FF4458',
    borderColor: '#FF4458',
  },
  genderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  genderLabelSelected: {
    color: '#FFFFFF',
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  radiusBadge: {
    backgroundColor: '#FF4458',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  radiusBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sliderContainer: {
    paddingHorizontal: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 13,
    color: '#999999',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  completeButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completeButtonDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Height styles
  heightInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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

  // Occupation styles
  occupationContainer: {
    position: 'relative',
  },
  occupationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
  },
  occupationIcon: {
    marginRight: 12,
  },
  occupationInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    paddingVertical: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    zIndex: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  // Inline suggestions list (not absolute positioned - always clickable)
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

  // Social handles styles
  socialHandlesContainer: {
    gap: 12,
  },
  socialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
  },
  xLogo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default DatingPreferencesScreen;
