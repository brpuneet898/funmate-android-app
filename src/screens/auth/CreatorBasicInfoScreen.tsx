/**
 * CREATOR BASIC ACCOUNT INFO SCREEN
 * 
 * Collects basic account information for event creators (both Individual & Merchant)
 * This is the same for both creator types - branching happens later
 * 
 * Fields collected:
 * - Full Name (person creating account)
 * - Email
 * - Username (@handle)
 * - Password
 * - Confirm Password
 * 
 * OR: Continue with Google (auto-fills name & email)
 * 
 * Database Updates:
 * 1. Links email/Google credential to existing phone auth
 * 2. Creates accounts/{accountId} with role: "event_creator"
 * 3. Creates users/{userId} with minimal creator profile
 * 
 * Next: CreatorTypeSelection (Individual vs Merchant)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';
import Toast from 'react-native-toast-message';

interface CreatorBasicInfoScreenProps {
  navigation: any;
  route: any;
}

const CreatorBasicInfoScreen: React.FC<CreatorBasicInfoScreenProps> = ({ navigation, route }) => {
  const { phoneNumber } = route.params;

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  /**
   * Calculate password strength
   */
  const getPasswordStrength = (pass: string) => {
    const requirements = {
      minLength: pass.length >= 6,
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[@#$%^&*()!]/.test(pass),
    };

    if (!pass) return { score: 0, label: '', color: '#E0E0E0', requirements };

    const score = Object.values(requirements).filter(Boolean).length;

    let label = '';
    let color = '';

    if (score <= 2) {
      label = 'Weak';
      color = '#FF4458';
    } else if (score === 3) {
      label = 'Fair';
      color = '#FFA500';
    } else if (score <= 5) {
      label = 'Good';
      color = '#8BC34A';
    } else {
      label = 'Strong';
      color = '#4CAF50';
    }

    return { score, label, color, requirements };
  };

  const passwordStrength = getPasswordStrength(password);

  // DEBUG: Log password changes
  console.log('PASSWORD:', password, 'LENGTH:', password.length, 'SCORE:', passwordStrength.score);

  // Check username availability with debounce
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setCheckingUsername(true);
      try {
        const snapshot = await firestore()
          .collection('users')
          .where('username', '==', username.toLowerCase())
          .limit(1)
          .get();
        
        setUsernameAvailable(snapshot.empty);
      } catch (error) {
        console.error('Username check error:', error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Check if username is already taken
   */
  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    try {
      const normalizedUsername = username.toLowerCase();
      const snapshot = await firestore()
        .collection('users')
        .where('username', '==', normalizedUsername)
        .limit(1)
        .get();

      return snapshot.empty;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  };

  /**
   * Handle email/password signup
   */
  const handleEmailSignup = async () => {
    try {
      // Validation
      if (!fullName.trim()) {
        Toast.show({ type: 'error', text1: 'Full Name Required', text2: 'Please enter your full name' });
        return;
      }

      if (!email.trim() || !isValidEmail(email)) {
        Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address' });
        return;
      }

      if (!username.trim() || username.length < 3) {
        Toast.show({ type: 'error', text1: 'Invalid Username', text2: 'Username must be at least 3 characters' });
        return;
      }

      if (usernameAvailable === false) {
        Toast.show({ type: 'error', text1: 'Username Taken', text2: 'This username is already taken' });
        return;
      }

      if (password.length < 6) {
        Toast.show({ type: 'error', text1: 'Password Too Short', text2: 'Password must be at least 6 characters' });
        return;
      }

      if (passwordStrength.score < 4) {
        Toast.show({ type: 'error', text1: 'Password Too Weak', text2: 'Please create a Good or Strong password' });
        return;
      }

      if (password !== confirmPassword) {
        Toast.show({ type: 'error', text1: 'Passwords Don\'t Match', text2: 'Please make sure passwords match' });
        return;
      }

      setLoading(true);

      // Get current user (authenticated with phone)
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Link email/password credential
      const emailCredential = auth.EmailAuthProvider.credential(email.trim(), password);
      await user.linkWithCredential(emailCredential);
      console.log('✅ Email credential linked to phone auth');

      // Send email verification
      await user.sendEmailVerification();
      console.log('📧 Verification email sent');

      setLoading(false);
      
      Toast.show({
        type: 'success',
        text1: 'Verification Email Sent',
        text2: 'Check your inbox to verify your email',
        visibilityTime: 3000,
      });

      // Navigate to Email Verification Screen
      setTimeout(() => {
        navigation.navigate('CreatorEmailVerification', {
          phoneNumber,
          fullName: fullName.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
        });
      }, 1000);

    } catch (error: any) {
      console.error('❌ Email signup error:', error);
      setLoading(false);
      
      let errorMessage = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already registered';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }

      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: errorMessage,
        visibilityTime: 4000,
      });
    }
  };

  /**
   * Handle Google Sign-In
   */
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      // Get current user (authenticated with phone)
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Sign out from Google first to force account picker
      await GoogleSignin.signOut();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      // Get tokens
      const tokens = await GoogleSignin.getTokens();
      
      // Create Google credential
      const googleCredential = auth.GoogleAuthProvider.credential(tokens.idToken);

      // Link Google credential to phone auth
      await user.linkWithCredential(googleCredential);
      console.log('✅ Google credential linked to phone auth');

      // Reload user to get updated profile
      await user.reload();
      const updatedUser = auth().currentUser;

      setLoading(false);

      // Navigate to Google profile setup screen (similar to explorer flow)
      navigation.navigate('CreatorGoogleProfileSetup', {
        googleUser: {
          uid: user.uid,
          email: userInfo.data?.user.email || updatedUser?.email,
          displayName: userInfo.data?.user.name || updatedUser?.displayName,
          photoURL: userInfo.data?.user.photo || updatedUser?.photoURL,
        },
      });

    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      setLoading(false);
      
      if (error.code === 'sign_in_cancelled') {
        return;
      }
      
      let errorMessage = 'Failed to sign in with Google';
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'This email is already registered with a different method';
      } else if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'This Google account is already linked to another user';
      }

      Toast.show({
        type: 'error',
        text1: 'Google Sign-In Failed',
        text2: errorMessage,
        visibilityTime: 4000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAwareScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={100}
        extraHeight={150}
        enableAutomaticScroll={true}
        keyboardOpeningTime={0}
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
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Let's get to know you better</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full Name"
            placeholderTextColor="#999999"
            autoCapitalize="words"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email Address"
            placeholderTextColor="#999999"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <View style={styles.usernameContainer}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="#999999"
              autoCapitalize="none"
              editable={!loading}
            />
            {username.length >= 3 && (
              <View style={styles.usernameStatus}>
                {checkingUsername ? (
                  <ActivityIndicator size="small" color="#FF4458" />
                ) : usernameAvailable === true ? (
                  <Text style={styles.availableText}>✓ Available</Text>
                ) : usernameAvailable === false ? (
                  <Text style={styles.unavailableText}>✗ Taken</Text>
                ) : null}
              </View>
            )}
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#999999"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                size={22} 
                color="#666666" 
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <View style={styles.passwordStrengthContainer}>
              <View style={styles.strengthBarBackground}>
                <View 
                  style={[
                    styles.strengthBarFill, 
                    { 
                      width: `${(passwordStrength.score / 6) * 100}%`,
                      backgroundColor: passwordStrength.color 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                {passwordStrength.label}
              </Text>
            </View>
          )}

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              placeholderTextColor="#999999"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} 
                size={22} 
                color="#666666" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Continue with Google Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 12 }}>
            <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <Path fill="none" d="M0 0h48v48H0z" />
          </Svg>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleEmailSignup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
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
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  },
  form: {
    paddingHorizontal: 32,
    gap: 16,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
    height: 56,
    justifyContent: 'center',
  },
  usernameContainer: {
    position: 'relative',
  },
  usernameStatus: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  unavailableText: {
    color: '#FF4458',
    fontSize: 14,
    fontWeight: '600',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingRight: 50,
    fontSize: 16,
    color: '#1A1A1A',
    height: 56,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 0,
    height: 56,
    justifyContent: 'center',
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  strengthBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginHorizontal: 32,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  googleButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 32,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreatorBasicInfoScreen;
