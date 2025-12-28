import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import DatePicker from 'react-native-date-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface ProfileSetupScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;
  route: any;
}

const ProfileSetupScreen = ({ navigation, route }: ProfileSetupScreenProps) => {
  const { phoneNumber } = route.params;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (!username.trim() || username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return false;
    }
    if (usernameAvailable === false) {
      Alert.alert('Error', 'Username is already taken');
      return false;
    }
    if (!dob) {
      Alert.alert('Error', 'Please select your date of birth');
      return false;
    }
    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Update user's email in Firebase Auth
      await user.updateEmail(email);
      
      // Send verification email
      await user.sendEmailVerification();
      
      setLoading(false);
      Alert.alert(
        'Verification Email Sent',
        `We've sent a verification link to ${email}. Please check your email and click the link to verify.`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('EmailVerification', {
                phoneNumber,
                fullName,
                email,
                username,
                dob: formatDate(dob),
                gender,
                password,
              });
            },
          },
        ]
      );
    } catch (error: any) {
      setLoading(false);
      console.error('Email update error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send verification email. Please try again.'
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // TODO: Implement Google Sign-In
      console.log('Google Sign-In clicked');
      Alert.alert('Coming Soon', 'Google Sign-In will be implemented next');
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Google Sign-In failed');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
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
          />

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email Address"
            placeholderTextColor="#999999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor="#999999"
            autoCapitalize="none"
          />
          {username.length >= 3 && (
            <View style={styles.usernameStatus}>
              {checkingUsername ? (
                <ActivityIndicator size="small" color="#FF4458" />
              ) : usernameAvailable === true ? (
                <Text style={styles.availableText}>✓ Available</Text>
              ) : usernameAvailable === false ? (
                <Text style={styles.unavailableText}>✗ Already taken</Text>
              ) : null}
            </View>
          )}

          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={dob ? styles.inputText : styles.placeholderText}>
              {dob ? formatDate(dob) : 'Date of Birth'}
            </Text>
          </TouchableOpacity>

          <DatePicker
            modal
            open={showDatePicker}
            date={dob || new Date(2000, 0, 1)}
            mode="date"
            maximumDate={new Date()}
            minimumDate={new Date(1950, 0, 1)}
            onConfirm={(date) => {
              setShowDatePicker(false);
              setDob(date);
            }}
            onCancel={() => setShowDatePicker(false)}
          />

          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowGenderPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={gender ? styles.inputText : styles.placeholderText}>
              {gender || 'Select Gender'}
            </Text>
          </TouchableOpacity>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#999999"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              placeholderTextColor="#999999"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeIconText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
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
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {['Male', 'Female', 'Non-Binary', 'Prefer not to say'].map((g) => (
              <TouchableOpacity
                key={g}
                style={styles.genderOption}
                onPress={() => {
                  setGender(g);
                  setShowGenderPicker(false);
                }}
              >
                <Text style={styles.genderOptionText}>{g}</Text>
                {gender === g && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  header: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 32,
  },
  backButton: {
    fontSize: 32,
    color: '#1A1A1A',
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
  inputText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999999',
  },
  usernameStatus: {
    position: 'absolute',
    right: 48,
    top: 305,
    height: 56,
    justifyContent: 'center',
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
  eyeIconText: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  checkmark: {
    fontSize: 20,
    color: '#FF4458',
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  bottomSpacer: {
    height: 40,
  },
});

export default ProfileSetupScreen;
