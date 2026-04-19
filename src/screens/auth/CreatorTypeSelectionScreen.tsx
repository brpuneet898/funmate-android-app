/**
 * CREATOR TYPE SELECTION SCREEN
 * 
 * After email verification, creators choose their type:
 * - Individual Host (personal events, freelance organizers)
 * - Merchant Organizer (businesses, venues, brands)
 * 
 * Database Update:
 * - Updates accounts/{accountId}.creatorType to "individual" or "merchant"
 * 
 * Next Steps:
 * - Individual → IndividualVerificationScreen (Aadhaar/PAN)
 * - Merchant → MerchantVerificationScreen (GST/PAN/License)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface CreatorTypeSelectionScreenProps {
  navigation: any;
}

type CreatorType = 'individual' | 'merchant';

const CreatorTypeSelectionScreen: React.FC<CreatorTypeSelectionScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<CreatorType | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Update creator type in accounts collection
   */
  const updateCreatorType = async (type: CreatorType) => {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Set signupStep based on creator type
    const signupStep = type === 'individual' 
      ? 'individual_host_verification' 
      : 'merchant_verification'; // TODO: Add merchant_verification to SignupStep type

    await firestore()
      .collection('accounts')
      .doc(user.uid)
      .update({
        creatorType: type,
        signupStep: signupStep,
      });

    console.log(`✅ Creator type set to: ${type}, signupStep: ${signupStep}`);
  };

  /**
   * Handle selection and navigation
   */
  const handleContinue = async () => {
    if (!selectedType) {
      Toast.show({
        type: 'error',
        text1: 'Selection Required',
        text2: 'Please choose your creator type',
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Update creator type in database
      await updateCreatorType(selectedType);

      setLoading(false);

      Toast.show({
        type: 'success',
        text1: 'Type Selected',
        text2: `You're registered as ${selectedType === 'individual' ? 'Individual Host' : 'Merchant Organizer'}`,
        visibilityTime: 3000,
      });

      // Navigate to respective verification flow
      setTimeout(() => {
        if (selectedType === 'individual') {
          // TODO: Navigate to IndividualVerificationScreen
          navigation.navigate('IndividualVerification');
        } else {
          // TODO: Navigate to MerchantVerificationScreen
          navigation.navigate('MerchantVerification');
        }
      }, 1000);

    } catch (error: any) {
      setLoading(false);
      console.error('Error setting creator type:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Failed to update creator type',
        visibilityTime: 4000,
      });
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/bg_splash.webp')}
      style={styles.container}
      resizeMode="cover"
      blurRadius={6}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { paddingTop: insets.top + 24 }]}>
            <Text style={styles.title}>Choose Your Creator Type</Text>
            <Text style={styles.subtitle}>
              Select how you'll be hosting events on Funmate
            </Text>

            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedType === 'individual' && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedType('individual')}
              activeOpacity={0.85}
            >
              <View style={styles.optionHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="person"
                    size={30}
                    color={selectedType === 'individual' ? '#A855F7' : 'rgba(255,255,255,0.72)'}
                  />
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedType === 'individual' && styles.radioButtonSelected,
                  ]}
                >
                  {selectedType === 'individual' && <View style={styles.radioButtonInner} />}
                </View>
              </View>

              <Text
                style={[
                  styles.optionTitle,
                  selectedType === 'individual' && styles.optionTitleSelected,
                ]}
              >
                Individual Host
              </Text>

              <Text style={styles.optionDescription}>
                Perfect for freelance event organizers, DJs, performers, and independent hosts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedType === 'merchant' && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedType('merchant')}
              activeOpacity={0.85}
            >
              <View style={styles.optionHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="business"
                    size={30}
                    color={selectedType === 'merchant' ? '#A855F7' : 'rgba(255,255,255,0.72)'}
                  />
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedType === 'merchant' && styles.radioButtonSelected,
                  ]}
                >
                  {selectedType === 'merchant' && <View style={styles.radioButtonInner} />}
                </View>
              </View>

              <Text
                style={[
                  styles.optionTitle,
                  selectedType === 'merchant' && styles.optionTitleSelected,
                ]}
              >
                Merchant Organizer
              </Text>

              <Text style={styles.optionDescription}>
                For businesses, venues, brands, and registered organizations
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleContinue}
              disabled={!selectedType || loading}
              activeOpacity={0.85}
              style={{ marginTop: 8 }}
            >
              <LinearGradient
                colors={selectedType ? ['#8B2BE2', '#06B6D4'] : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.10)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.continueButton,
                  !selectedType && styles.continueButtonDisabled,
                  { marginBottom: Math.max(32, insets.bottom + 16) },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 30, 0.60)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 26,
    color: '#FFFFFF',
    marginTop: 35,
    marginBottom: 10,
    fontFamily: 'Inter-Bold',
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 30,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    opacity: 2,
  },
  optionCardSelected: {
    borderColor: '#8B2BE2',
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    shadowColor: '#8B2BE2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 80,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#8B2BE2',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B2BE2',
  },
  optionTitle: {
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  optionTitleSelected: {
    color: '#FFFFFF',
  },
  optionDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  continueButton: {
    height: 54,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B2BE2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  continueButtonDisabled: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowOpacity: 0.8,
    elevation: 1,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
});

export default CreatorTypeSelectionScreen;
