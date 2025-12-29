import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import AccountTypeScreen from '../screens/auth/AccountTypeScreen';
import PhoneNumberScreen from '../screens/auth/PhoneNumberScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import GoogleProfileSetupScreen from '../screens/auth/GoogleProfileSetupScreen';
import PhotoUploadScreen from '../screens/auth/PhotoUploadScreen';
import IdentityVerificationIntroScreen from '../screens/auth/IdentityVerificationIntroScreen';
import LivenessVerificationScreen from '../screens/auth/LivenessVerificationScreen';

export type RootStackParamList = {
  Login: undefined;
  AccountType: undefined;
  PhoneNumber: undefined;
  OTPVerification: { phoneNumber: string; verificationId: string };
  ProfileSetup: { phoneNumber: string };
  EmailVerification: {
    phoneNumber: string;
    fullName: string;
    email: string;
    username: string;
    dob: string;
    gender: string;
    password: string;
  };
  GoogleProfileSetup: { googleUser: any };
  PhotoUpload: undefined;
  IdentityVerification: undefined;
  LivenessVerification: undefined;
  // TODO: Add more screens later
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AccountType" component={AccountTypeScreen} />
        <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="GoogleProfileSetup" component={GoogleProfileSetupScreen} />
        <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
        <Stack.Screen name="IdentityVerification" component={IdentityVerificationIntroScreen} />
        <Stack.Screen name="LivenessVerification" component={LivenessVerificationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
