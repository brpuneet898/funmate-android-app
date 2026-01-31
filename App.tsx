/**
 * Funmate - Dating + Event Booking App
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainerRef } from '@react-navigation/native';
import SplashScreen from './src/screens/splash/SplashScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeAppCheckService } from './src/config/firebaseAppCheck';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';
import auth from '@react-native-firebase/auth';
import notificationService from './src/services/NotificationService';
import { RootStackParamList } from './src/navigation/AppNavigator';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    // App Check disabled for now - will enable with Play Store release
    // initializeAppCheckService();
    
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '544227080732-ag40c3g4g64tgv910cu1it16bmmn4g3m.apps.googleusercontent.com', // Replace with your Web Client ID
      offlineAccess: false,
    });

    // Initialize push notifications when user is logged in
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in, initialize notifications
        await notificationService.initialize((screen, params) => {
          // Navigate to screen when notification is tapped
          if (navigationRef.current) {
            navigationRef.current.navigate(screen as any, params as any);
          }
        });
      }
    });

    return unsubscribe;
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator ref={navigationRef} />
      <Toast />
    </SafeAreaProvider>
  );
}

export default App;
