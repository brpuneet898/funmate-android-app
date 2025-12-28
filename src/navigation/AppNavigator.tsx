import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import AccountTypeScreen from '../screens/auth/AccountTypeScreen';
import PhoneNumberScreen from '../screens/auth/PhoneNumberScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';

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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
