/**
 * Dating Preferences Screen
 * 
 * Final profile setup screen where users set:
 * - Bio (about me)
 * - Relationship intent (what they're looking for)
 * - Interested in (gender preferences)
 * - Match radius (distance)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Slider from '@react-native-community/slider';

interface DatingPreferencesScreenProps {
  navigation: any;
}

type RelationshipIntent = 'casual' | 'long_term' | 'hookups' | 'friendship' | 'unsure';
type Gender = 'male' | 'female' | 'trans' | 'non_binary';

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

const DatingPreferencesScreen: React.FC<DatingPreferencesScreenProps> = ({ navigation }) => {
  const [bio, setBio] = useState('');
  const [relationshipIntent, setRelationshipIntent] = useState<RelationshipIntent | null>(null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [matchRadiusKm, setMatchRadiusKm] = useState(25);
  const [saving, setSaving] = useState(false);

  const handleToggleGender = (gender: Gender) => {
    if (interestedIn.includes(gender)) {
      setInterestedIn(prev => prev.filter(g => g !== gender));
    } else {
      setInterestedIn(prev => [...prev, gender]);
    }
  };

  const handleComplete = async () => {
    // Validation
    if (bio.trim().length < 20) {
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

    if (!relationshipIntent) {
      Toast.show({
        type: 'error',
        text1: 'Select Relationship Intent',
        text2: 'Let us know what you\'re looking for',
        visibilityTime: 3000,
      });
      return;
    }

    if (interestedIn.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Select Gender Preference',
        text2: 'Who would you like to meet?',
        visibilityTime: 3000,
      });
      return;
    }

    setSaving(true);

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Save dating preferences to users collection (following database schema)
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          bio: bio.trim(),
          relationshipIntent,
          interestedIn,
          matchRadiusKm,
        });

      console.log('✅ Dating preferences saved');

      Toast.show({
        type: 'success',
        text1: 'Profile Complete! 🎉',
        text2: 'Welcome to Funmate',
        visibilityTime: 2000,
      });

      // TODO: Navigate to main app (home/swipe screen) or location permission screen
      // navigation.navigate('MainApp');

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
  const bioValid = bioCharCount >= 20 && bioCharCount <= 500;

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
              bioValid ? styles.charCountValid : (bioCharCount > 0 ? styles.charCountInvalid : {})
            ]}>
              {bioCharCount}/500 {bioCharCount >= 20 ? '✓' : `(min 20)`}
            </Text>
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

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>

      {/* Complete Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            (!bioValid || !relationshipIntent || interestedIn.length === 0 || saving) && styles.completeButtonDisabled,
          ]}
          onPress={handleComplete}
          disabled={!bioValid || !relationshipIntent || interestedIn.length === 0 || saving}
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
});

export default DatingPreferencesScreen;
