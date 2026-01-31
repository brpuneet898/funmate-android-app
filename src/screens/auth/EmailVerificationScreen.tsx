import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import auth, { getAuth } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface EmailVerificationScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailVerification'>;
  route: any;
}

const EmailVerificationScreen = ({ navigation, route }: EmailVerificationScreenProps) => {
  const { phoneNumber, fullName, email, username, dob, gender, password } = route.params;
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const checkEmailVerification = async () => {
    setChecking(true);
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Reload user to get fresh email verification status
      await user.reload();
      const updatedUser = auth().currentUser;
      
      if (updatedUser?.emailVerified) {
        setIsVerified(true);
        setChecking(false);
        return true;
      } else {
        setChecking(false);
        Toast.show({
          type: 'info',
          text1: 'Not Verified Yet',
          text2: 'Please check your email and click the verification link',
          visibilityTime: 4000,
        });
        return false;
      }
    } catch (error: any) {
      setChecking(false);
      console.error('Verification check error:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: 'Failed to check verification status',
        visibilityTime: 3000,
      });
      return false;
    }
  };

  const calculateAge = (dobString: string) => {
    const [day, month, year] = dobString.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const saveUserData = async () => {
    const user = auth().currentUser;
    if (!user) throw new Error('No authenticated user');

    const accountId = user.uid;
    const age = calculateAge(dob);

    // Email/password already linked in ProfileSetupScreen, no need to link again

    // Create account document (following schema exactly)
    await firestore().collection('accounts').doc(accountId).set({
      authUid: user.uid,
      role: 'user',
      creatorType: null,
      status: 'active',
      phoneVerified: true,
      emailVerified: user.emailVerified, // From Firebase Auth
      identityVerified: false,
      bankVerified: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    // Create user document (following schema exactly)
    await firestore().collection('users').doc(accountId).set({
      accountId,
      username: username.toLowerCase(),
      name: fullName,
      age,
      gender: gender.toLowerCase(),
      bio: '',
      relationshipIntent: 'unsure',
      interestedIn: [],
      matchRadiusKm: 50,
      interests: [],
      location: null,
      photos: [],
      isVerified: false,
      premiumStatus: 'free',
      premiumExpiresAt: null,
      premiumFeatures: {
        unlimitedSwipes: false,
        seeWhoLikedYou: false,
        audioVideoCalls: false,
        priorityListing: false,
      },
      creatorDetails: null,
      createdAt: firestore.FieldValue.serverTimestamp(),
      lastActiveAt: firestore.FieldValue.serverTimestamp(),
    });
  };

  const handleVerify = async () => {
    setLoading(true);
    
    try {
      // Check if email is verified
      const verified = await checkEmailVerification();
      
      if (!verified) {
        setLoading(false);
        return;
      }
      
      // Save user data to Firestore
      await saveUserData();
      
      setLoading(false);
      Toast.show({
        type: 'success',
        text1: 'Email Verified!',
        text2: 'Your account is ready',
        visibilityTime: 3000,
      });
      
      setTimeout(() => {
        navigation.navigate('PhotoUpload');
      }, 1000);
    } catch (error: any) {
      setLoading(false);
      console.error('Email verification error:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'An error occurred. Please try again',
        visibilityTime: 4000,
      });
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      await user.sendEmailVerification();
      
      // Reset timer
      setResendTimer(30);
      setCanResend(false);
      
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: 'A new verification email has been sent',
        visibilityTime: 3000,
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: error.message || 'Failed to resend verification email',
        visibilityTime: 3000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to {email}
        </Text>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>📧 Check your email inbox</Text>
          <Text style={styles.instructionText}>🔗 Click the verification link</Text>
          <Text style={styles.instructionText}>✅ Come back and tap "I've Verified"</Text>
        </View>

        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Email Verified!</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.checkButton}
          onPress={checkEmailVerification}
          disabled={checking}
          activeOpacity={0.8}
        >
          {checking ? (
            <ActivityIndicator color="#FF4458" />
          ) : (
            <Text style={styles.checkButtonText}>Check Verification Status</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            !isVerified && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={!isVerified || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>I've Verified - Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive email? </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResendCode} activeOpacity={0.7}>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
          )}
        </View>
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
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 40,
  },
  instructionsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 12,
    lineHeight: 24,
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
  },
  checkButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkButtonText: {
    color: '#FF4458',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: '#FFB3BC',
    elevation: 0,
    shadowOpacity: 0,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 15,
    color: '#666666',
  },
  resendLink: {
    fontSize: 15,
    color: '#FF4458',
    fontWeight: '600',
  },
  resendTimer: {
    fontSize: 15,
    color: '#999999',
    fontWeight: '500',
  },
});

export default EmailVerificationScreen;
