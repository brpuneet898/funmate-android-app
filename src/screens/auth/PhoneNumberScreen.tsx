import React, { useState } from 'react';
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
import auth, { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';

interface PhoneNumberScreenProps {
  navigation: any;
}

const PhoneNumberScreen = ({ navigation }: PhoneNumberScreenProps) => {
  const [countryCode, setCountryCode] = useState<CountryCode>('IN');
  const [callingCode, setCallingCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(`+${country.callingCode[0]}`);
  };

  const handleContinue = async () => {
    if (phoneNumber.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    
    try {
      const fullPhoneNumber = callingCode + phoneNumber;
      console.log('Sending OTP to:', fullPhoneNumber);
      
      // Use modular API
      const authInstance = getAuth();
      const confirmation = await signInWithPhoneNumber(
        authInstance,
        fullPhoneNumber
      );
      
      console.log('OTP sent successfully');
      setLoading(false);
      
      // Pass only verificationId to avoid navigation serialization warnings
      navigation.navigate('OTPVerification', {
        phoneNumber: fullPhoneNumber,
        verificationId: confirmation.verificationId,
      });
    } catch (error: any) {
      setLoading(false);
      console.error('Phone auth error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send verification code. Please try again.'
      );
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
        <Text style={styles.title}>Enter Your Phone Number</Text>
        <Text style={styles.subtitle}>
          We'll send you a verification code
        </Text>

        {/* Phone Input */}
        <View style={styles.phoneInputContainer}>
          <TouchableOpacity
            style={styles.countryCodeContainer}
            onPress={() => setShowCountryPicker(true)}
            activeOpacity={0.7}
          >
            <CountryPicker
              countryCode={countryCode}
              withFilter
              withFlag
              withCallingCode
              withEmoji
              onSelect={onSelectCountry}
              visible={showCountryPicker}
              onClose={() => setShowCountryPicker(false)}
            />
            <Text style={styles.countryCodeText}>{callingCode}</Text>
          </TouchableOpacity>
          
          <View style={styles.phoneNumberContainer}>
            <TextInput
              style={styles.phoneNumberInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone Number"
              placeholderTextColor="#999999"
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
            />
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            phoneNumber.length < 10 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={phoneNumber.length < 10 || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Get Code</Text>
          )}
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
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    alignItems: 'stretch',
  },
  countryCodeContainer: {
    width: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  phoneNumberContainer: {
    flex: 1,
  },
  phoneNumberInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
    height: 56,
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
    backgroundColor: '#FFB3BC',
    elevation: 0,
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhoneNumberScreen;
