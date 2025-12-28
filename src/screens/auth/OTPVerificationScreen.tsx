import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import auth, { getAuth, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from '@react-native-firebase/auth';

interface OTPVerificationScreenProps {
  navigation: any;
  route: any;
}

const OTPVerificationScreen = ({ navigation, route }: OTPVerificationScreenProps) => {
  const { phoneNumber, verificationId } = route.params as {
    phoneNumber: string;
    verificationId: string;
  };
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Alert.alert('Incomplete Code', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Verifying OTP:', otpCode);
      
      // Use modular API to create credential and sign in
      const credential = PhoneAuthProvider.credential(verificationId, otpCode);
      const authInstance = getAuth();
      await signInWithCredential(authInstance, credential);
      
      setLoading(false);
      console.log('Phone verified! User ID:', auth().currentUser?.uid);
      
      // Navigate to profile setup
      navigation.navigate('ProfileSetup', { phoneNumber });
    } catch (error: any) {
      setLoading(false);
      console.error('OTP verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.message || 'Invalid code. Please try again.'
      );
    }
  };

  const handleResendCode = async () => {
    try {
      console.log('Resending code to:', phoneNumber);
      
      const authInstance = getAuth();
      const newConfirmation = await signInWithPhoneNumber(
        authInstance,
        phoneNumber
      );
      
      Alert.alert('Code Sent', 'A new verification code has been sent');
      
      // Update verificationId in route params
      navigation.setParams({ verificationId: newConfirmation.verificationId });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a code to {phoneNumber}
        </Text>

        {/* OTP Input Boxes */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpBox,
                digit && styles.otpBoxFilled,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            otp.join('').length !== 6 && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={otp.join('').length !== 6 || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        {/* Resend Code */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive code? </Text>
          <TouchableOpacity onPress={handleResendCode} activeOpacity={0.7}>
            <Text style={styles.resendLink}>Resend</Text>
          </TouchableOpacity>
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
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    fontSize: 32,
    color: '#1A1A1A',
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpBox: {
    width: 50,
    height: 56,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F5F5F5',
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: '#FF4458',
    backgroundColor: '#FFF5F6',
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
});

export default OTPVerificationScreen;
