import React, { useState, useEffect, forwardRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import MainTabNavigator from './MainTabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import EmailLoginScreen from '../screens/auth/EmailLoginScreen';
import AccountTypeScreen from '../screens/auth/AccountTypeScreen';
import PhoneNumberScreen from '../screens/auth/PhoneNumberScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import CreatorBasicInfoScreen from '../screens/auth/CreatorBasicInfoScreen';
import CreatorGoogleProfileSetupScreen from '../screens/auth/CreatorGoogleProfileSetupScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import GoogleProfileSetupScreen from '../screens/auth/GoogleProfileSetupScreen';
import PhotoUploadScreen from '../screens/auth/PhotoUploadScreen';
import IdentityVerificationIntroScreen from '../screens/auth/IdentityVerificationIntroScreen';
import LivenessVerificationScreen from '../screens/auth/LivenessVerificationScreen';
import InterestsSelectionScreen from '../screens/auth/InterestsSelectionScreen';
import DatingPreferencesScreen from '../screens/auth/DatingPreferencesScreen';
import CreatorEmailVerificationScreen from '../screens/auth/CreatorEmailVerificationScreen';
import CreatorTypeSelectionScreen from '../screens/auth/CreatorTypeSelectionScreen';
import IndividualVerificationScreen from '../screens/auth/IndividualVerificationScreen';
import LikesSwiperScreen from '../screens/main/LikesSwiperScreen';
import ChatScreen from '../screens/main/ChatScreen';
import { BlockedUsersScreen } from '../screens/settings/BlockedUsersScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';

export type RootStackParamList = {
  Login: undefined;
  EmailLogin: undefined;
  MainTabs: undefined;
  AccountType: undefined;
  PhoneNumber: { accountType?: 'user' | 'creator'; isLogin?: boolean };
  OTPVerification: { phoneNumber: string; verificationId: string; accountType?: 'user' | 'creator'; isLogin?: boolean };
  ProfileSetup: { phoneNumber: string };
  CreatorBasicInfo: { phoneNumber: string };
  CreatorGoogleProfileSetup: { googleUser: any };
  CreatorEmailVerification: {
    phoneNumber: string;
    fullName: string;
    email: string;
    username: string;
    password: string;
  };
  CreatorTypeSelection: undefined;
  IndividualVerification: undefined;
  IndividualBankDetails: undefined;
  MerchantVerification: undefined;
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
  InterestsSelection: undefined;
  DatingPreferences: undefined;
  LikesSwiper: { clickedUserId: string };
  Chat: {
    chatId: string | null;
    recipientId: string;
    recipientName?: string;
    recipientPhoto?: string;
  };
  BlockedUsers: undefined;
  NotificationSettings: undefined;
  // TODO: Add more screens later
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = forwardRef<NavigationContainerRef<RootStackParamList>, {}>((props, ref) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Handle user state changes
  useEffect(() => {
    const subscriber = auth().onAuthStateChanged((userState) => {
      setUser(userState);
      if (initializing) setInitializing(false);
    });
    return subscriber; // Unsubscribe on unmount
  }, [initializing]);

  // Show loading screen while checking auth state
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={user ? 'MainTabs' : 'Login'}
      >
        {/* Auth screens - always available for signup flow */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
        <Stack.Screen name="AccountType" component={AccountTypeScreen} />
        <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="CreatorBasicInfo" component={CreatorBasicInfoScreen} />
        <Stack.Screen name="CreatorGoogleProfileSetup" component={CreatorGoogleProfileSetupScreen} />
        <Stack.Screen name="CreatorEmailVerification" component={CreatorEmailVerificationScreen} />
        <Stack.Screen name="CreatorTypeSelection" component={CreatorTypeSelectionScreen} />
        <Stack.Screen name="IndividualVerification" component={IndividualVerificationScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="GoogleProfileSetup" component={GoogleProfileSetupScreen} />
        <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
        <Stack.Screen name="IdentityVerification" component={IdentityVerificationIntroScreen} />
        <Stack.Screen name="LivenessVerification" component={LivenessVerificationScreen} />
        <Stack.Screen name="InterestsSelection" component={InterestsSelectionScreen} />
        <Stack.Screen name="DatingPreferences" component={DatingPreferencesScreen} />
        <Stack.Screen name="LikesSwiper" component={LikesSwiperScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen 
          name="BlockedUsers" 
          component={BlockedUsersScreen}
          options={{ 
            headerShown: true,
            title: 'Blocked Users',
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#1A1A1A',
          }}
        />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        {/* Main app - after auth */}
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default AppNavigator;
