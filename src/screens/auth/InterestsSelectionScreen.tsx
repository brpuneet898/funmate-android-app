/**
 * Interests Selection Screen
 * 
 * Users select 5-15 interests from various categories.
 * Selected interests appear as chips at the top and can be removed.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface InterestsSelectionScreenProps {
  navigation: any;
}

// Interest categories with tags (similar to Bumble, Hinge, Tinder)
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
    icon: 'heart-outline',
    tags: [
      'Meditation', 'Mindfulness', 'Sustainability', 'Volunteering',
      'Animal Lover', 'Dogs', 'Cats', 'Plant Parent', 'Minimalism',
      'Festivals', 'Spirituality', 'Self-improvement', 'Podcasts',
    ],
  },
  {
    id: 'social',
    name: 'Social & Nightlife',
    icon: 'people-outline',
    tags: [
      'Clubbing', 'Karaoke', 'Pub Quiz', 'Game Nights', 'Brunch',
      'House Parties', 'Rooftop Bars', 'Comedy Shows', 'Trivia',
      'Socializing', 'Networking', 'Making Friends',
    ],
  },
  {
    id: 'tech',
    name: 'Tech & Innovation',
    icon: 'laptop-outline',
    tags: [
      'Coding', 'AI', 'Startups', 'Crypto', 'Tech Gadgets',
      'Video Editing', 'Content Creation', 'Social Media',
      'Blogging', 'YouTube', 'E-sports', 'VR/AR',
    ],
  },
];

const InterestsSelectionScreen: React.FC<InterestsSelectionScreenProps> = ({ navigation }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('movies_tv');
  const [saving, setSaving] = useState(false);

  const handleToggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      // Remove interest
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      // Add interest (max 15)
      if (selectedInterests.length >= 15) {
        Toast.show({
          type: 'info',
          text1: 'Maximum Reached',
          text2: 'You can select up to 15 interests',
          visibilityTime: 2000,
        });
        return;
      }
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const handleContinue = async () => {
    if (selectedInterests.length < 5) {
      Toast.show({
        type: 'error',
        text1: 'Select More Interests',
        text2: `Please select at least 5 interests (${selectedInterests.length}/5)`,
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

      // Save interests to users collection (following database schema)
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          interests: selectedInterests,
        });

      console.log('✅ Interests saved:', selectedInterests);
      
      Toast.show({
        type: 'success',
        text1: 'Interests Saved!',
        text2: `${selectedInterests.length} interests selected`,
        visibilityTime: 2000,
      });

      // Navigate to Dating Preferences screen
      setTimeout(() => {
        navigation.navigate('DatingPreferences' as never);
      }, 1500);

    } catch (error: any) {
      console.error('❌ Error saving interests:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: error.message || 'Could not save interests. Please try again.',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
          <Text style={styles.title}>Your Interests</Text>
          <Text style={styles.subtitle}>Select 5-15 interests to help us find your match</Text>
        </View>
      </View>

      {/* Selected Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {selectedInterests.length} / 15 selected
        </Text>
        <Text style={[
          styles.minText,
          selectedInterests.length >= 5 && styles.minTextSuccess
        ]}>
          {selectedInterests.length >= 5 ? '✓ Minimum met' : `Minimum: 5`}
        </Text>
      </View>

      {/* Selected Interests Chips */}
      {selectedInterests.length > 0 && (
        <View style={styles.selectedContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedChipsContainer}
          >
            {selectedInterests.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={styles.selectedChip}
                onPress={() => handleToggleInterest(interest)}
                activeOpacity={0.7}
              >
                <Text style={styles.selectedChipText}>{interest}</Text>
                <Ionicons name="close-circle" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Categories */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {INTEREST_CATEGORIES.map((category) => (
          <View key={category.id} style={styles.categoryContainer}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => setExpandedCategory(
                expandedCategory === category.id ? null : category.id
              )}
              activeOpacity={0.7}
            >
              <View style={styles.categoryTitleRow}>
                <Ionicons name={category.icon as any} size={24} color="#FF4458" />
                <Text style={styles.categoryTitle}>{category.name}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {category.tags.filter(tag => selectedInterests.includes(tag)).length}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={expandedCategory === category.id ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#666666"
              />
            </TouchableOpacity>

            {expandedCategory === category.id && (
              <View style={styles.tagsContainer}>
                {category.tags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tag,
                      selectedInterests.includes(tag) && styles.tagSelected,
                    ]}
                    onPress={() => handleToggleInterest(tag)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedInterests.includes(tag) && styles.tagTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                    {selectedInterests.includes(tag) && (
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (selectedInterests.length < 5 || saving) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedInterests.length < 5 || saving}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {saving ? 'Saving...' : `Continue ${selectedInterests.length >= 5 ? `(${selectedInterests.length})` : ''}`}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
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
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4458',
  },
  minText: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
  },
  minTextSuccess: {
    color: '#4CAF50',
  },
  selectedContainer: {
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 12,
  },
  selectedChipsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4458',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  categoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#FF4458',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FAFAFA',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  tagSelected: {
    backgroundColor: '#FF4458',
    borderColor: '#FF4458',
  },
  tagText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  continueButton: {
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
  continueButtonDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default InterestsSelectionScreen;
