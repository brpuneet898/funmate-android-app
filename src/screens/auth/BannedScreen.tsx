import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';

type BannedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Banned'>;
type BannedScreenRouteProp = RouteProp<RootStackParamList, 'Banned'>;

interface BannedScreenProps {
  navigation: BannedScreenNavigationProp;
  route: BannedScreenRouteProp;
}

const BannedScreen = ({ navigation, route }: BannedScreenProps) => {
  const insets = useSafeAreaInsets();
  const banMessage = route.params?.banMessage || 'Violation of community guidelines.';

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true}/>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 32,
            paddingBottom: Math.max(32, insets.bottom + 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon area */}
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={['rgba(139, 43, 226, 0.20)', 'rgba(6, 182, 212, 0.20)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Ionicons name="sad-outline" size={72} color="#A855F7" />
          </LinearGradient>
        </View>

        {/* Heading */}
        <Text style={styles.oopsText}>Oops :/</Text>
        <Text style={styles.heading}>Account Suspended</Text>
        <Text style={styles.subheading}>
          Your access to Funmate has been restricted by the admin.
        </Text>

        {/* Reason card */}
        <View style={styles.reasonCard}>
          <View style={styles.reasonLabelRow}>
            <Ionicons name="alert-circle-outline" size={16} color="#A855F7" />
            <Text style={styles.reasonLabel}>Reason</Text>
          </View>
          <Text style={styles.reasonText}>{banMessage}</Text>
        </View>

        {/* Support hint */}
        <Text style={styles.supportText}>
          If you believe this is a mistake, please reach out to our support team.
        </Text>
      </ScrollView>

      {/* Sign Out Button — pinned at bottom */}
      <View
        style={[
          styles.buttonContainer,
          { paddingBottom: Math.max(24, insets.bottom + 16) },
        ]}
      >
        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.85}>
          <LinearGradient
            colors={['#8B2BE2', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0B1E',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  iconWrapper: {
    marginBottom: 28,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
  },
  oopsText: {
    fontFamily: 'Inter-Bold',
    fontSize: 38,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  heading: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  reasonCard: {
    width: '100%',
    backgroundColor: '#1A1530',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    padding: 18,
    marginBottom: 20,
  },
  reasonLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reasonLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#A855F7',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  reasonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
  },
  supportText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    paddingHorizontal: 28,
    paddingTop: 12,
    backgroundColor: '#0D0B1E',
  },
  signOutButton: {
    height: 54,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: '#FFFFFF',
  },
});

export default BannedScreen;
