/**
 * MAIN TAB NAVIGATOR
 * 
 * Bottom navigation bar shown after user completes signup
 * 4 main sections: My Hub, Swipe Hub, Event Hub, Profile
 * 
 * Also handles background location sync every hour
 */

import React, { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform, AppState } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import SwipeHubScreen from '../screens/main/SwipeHubScreen';
import MyHubScreen from '../screens/main/MyHubScreen';
import EventHubScreen from '../screens/main/EventHubScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Distance threshold in km to trigger location update
const LOCATION_UPDATE_THRESHOLD_KM = 0.5; // 500 meters
// Interval in milliseconds (1 hour)
const LOCATION_SYNC_INTERVAL = 60 * 60 * 1000;

export type MainTabParamList = {
  MyHub: undefined;
  SwipeHub: undefined;
  EventHub: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MainTabNavigator = () => {
  const locationSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  /**
   * Sync location: Compare current location with stored, update if different
   * Only syncs if permission already granted - does NOT request permission
   */
  const syncLocation = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId) return;

    try {
      // Check location permission - only check, don't request
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (!hasPermission) {
          console.log('📍 Location sync: No permission, skipping');
          return;
        }
      }

      // Get stored location from Firestore
      const userDoc = await firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();
      const storedLocation = userData?.location;

      // Get current device location
      Geolocation.getCurrentPosition(
        async (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;

          // If no stored location, save current
          if (!storedLocation?.latitude || !storedLocation?.longitude) {
            await firestore().collection('users').doc(userId).update({
              location: {
                latitude: currentLat,
                longitude: currentLng,
              },
              lastActiveAt: firestore.FieldValue.serverTimestamp(),
            });
            console.log('📍 Location sync: No stored location, saved current');
            return;
          }

          // Calculate distance between stored and current
          const distance = calculateDistance(
            storedLocation.latitude,
            storedLocation.longitude,
            currentLat,
            currentLng
          );

          console.log(`📍 Location sync: Distance from stored = ${distance.toFixed(3)} km`);

          // Update if moved more than threshold
          if (distance > LOCATION_UPDATE_THRESHOLD_KM) {
            await firestore().collection('users').doc(userId).update({
              location: {
                latitude: currentLat,
                longitude: currentLng,
              },
              lastActiveAt: firestore.FieldValue.serverTimestamp(),
            });
            console.log('📍 Location sync: Updated (moved significantly)');
          } else {
            // Just update lastActiveAt
            await firestore().collection('users').doc(userId).update({
              lastActiveAt: firestore.FieldValue.serverTimestamp(),
            });
            console.log('📍 Location sync: No update needed (same area)');
          }
        },
        (error) => {
          console.log('📍 Location sync error:', error.message);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
        }
      );
    } catch (error) {
      console.error('📍 Location sync failed:', error);
    }
  };

  /**
   * Start/stop location sync based on app state
   */
  useEffect(() => {
    // Initial sync when component mounts
    syncLocation();

    // Set up hourly interval
    locationSyncIntervalRef.current = setInterval(() => {
      console.log('📍 Hourly location sync triggered');
      syncLocation();
    }, LOCATION_SYNC_INTERVAL);

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - sync location
        console.log('📍 App foregrounded - syncing location');
        syncLocation();
      }
      appState.current = nextAppState;
    });

    // Cleanup
    return () => {
      if (locationSyncIntervalRef.current) {
        clearInterval(locationSyncIntervalRef.current);
      }
      subscription.remove();
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'MyHub':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'SwipeHub':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'EventHub':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF4458',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 60,
          paddingBottom: 10,
          paddingTop: 8,
          marginBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
      initialRouteName="SwipeHub"
    >
      <Tab.Screen 
        name="MyHub" 
        component={MyHubScreen}
        options={{
          tabBarLabel: 'My Hub',
        }}
      />
      <Tab.Screen 
        name="SwipeHub" 
        component={SwipeHubScreen}
        options={{
          tabBarLabel: 'Swipe Hub',
        }}
      />
      <Tab.Screen 
        name="EventHub" 
        component={EventHubScreen}
        options={{
          tabBarLabel: 'Event Hub',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
