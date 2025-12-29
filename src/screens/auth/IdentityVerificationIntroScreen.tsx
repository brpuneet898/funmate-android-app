/**
 * Identity Verification Introduction Screen
 * 
 * This screen explains the liveness verification process before opening the camera.
 * Shows instructions and has a button to start the verification.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface IdentityVerificationIntroScreenProps {
  navigation: any;
}

const IdentityVerificationIntroScreen: React.FC<IdentityVerificationIntroScreenProps> = ({ navigation }) => {
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
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={80} color="#FF4458" />
        </View>

        <Text style={styles.title}>Verify Yourself</Text>
        <Text style={styles.subtitle}>
          Complete identity verification to keep our community safe
        </Text>

        {/* Why Verification */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Why do we need this?</Text>
          <View style={styles.reasonRow}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#4CAF50" />
            <Text style={styles.reasonText}>Prevent fake profiles and catfishing</Text>
          </View>
          <View style={styles.reasonRow}>
            <Ionicons name="people-outline" size={24} color="#4CAF50" />
            <Text style={styles.reasonText}>Build a trusted community</Text>
          </View>
          <View style={styles.reasonRow}>
            <Ionicons name="heart-outline" size={24} color="#4CAF50" />
            <Text style={styles.reasonText}>Ensure authentic connections</Text>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>How it works:</Text>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Camera Opens</Text>
              <Text style={styles.stepDescription}>
                Your front camera will open with a circle overlay
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Follow Instructions</Text>
              <Text style={styles.stepDescription}>
                Center your face, turn left, turn right, and smile
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Automatic Verification</Text>
              <Text style={styles.stepDescription}>
                We'll verify your identity and you're done!
              </Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips for success:</Text>
          <Text style={styles.tipText}>• Find a well-lit area</Text>
          <Text style={styles.tipText}>• Remove glasses if possible</Text>
          <Text style={styles.tipText}>• Look directly at the camera</Text>
          <Text style={styles.tipText}>• Move your head slowly and smoothly</Text>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyContainer}>
          <Ionicons name="lock-closed" size={16} color="#666666" />
          <Text style={styles.privacyText}>
            Your live selfie will not be saved. It's only used for verification.
          </Text>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('LivenessVerification')}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.startButtonText}>Start Verification</Text>
        </TouchableOpacity>

        {/* Skip Note */}
        <Text style={styles.skipNote}>
          You have 5 attempts to complete verification
        </Text>
      </ScrollView>
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
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reasonText: {
    fontSize: 15,
    color: '#333333',
    flex: 1,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF4458',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  tipsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 6,
    lineHeight: 20,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  privacyText: {
    fontSize: 13,
    color: '#666666',
    flex: 1,
    lineHeight: 18,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  skipNote: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
  },
});

export default IdentityVerificationIntroScreen;
