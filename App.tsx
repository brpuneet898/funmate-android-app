/**
 * Funmate - Dating + Event Booking App
 * @format
 */

import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/screens/splash/SplashScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeAppCheckService } from './src/config/firebaseAppCheck';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Initialize App Check to avoid reCAPTCHA browser redirects
    initializeAppCheckService();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
