import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

interface AccountTypeScreenProps {
  navigation: any;
}

const AccountTypeScreen = ({ navigation }: AccountTypeScreenProps) => {
  const handleUserAccount = () => {
    console.log('Creating User Account');
    navigation.navigate('PhoneNumber');
  };

  const handleCreatorAccount = () => {
    console.log('Creating Event Creator Account');
    // TODO: Navigate to event creator signup flow
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Join Funmate</Text>
        <Text style={styles.subtitle}>How do you want to experience Funmate?</Text>
      </View>

      {/* Options Section */}
      <View style={styles.optionsSection}>
        {/* User Account Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleUserAccount}
          activeOpacity={0.9}
        >
          <Text style={styles.optionTitle}>Join as Explorer</Text>
          <Text style={styles.optionDescription}>
            Swipe, match, and discover events with people who share your vibe
          </Text>
        </TouchableOpacity>

        {/* Event Creator Account Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleCreatorAccount}
          activeOpacity={0.9}
        >
          <Text style={styles.optionTitle}>Join as Event Host</Text>
          <Text style={styles.optionDescription}>
            Create experiences, manage events, and monetize your community
          </Text>
        </TouchableOpacity>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  headerSection: {
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  optionsSection: {
    flex: 1,
    gap: 20,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#FFE6E9',
    elevation: 2,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF4458',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  backButtonText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '600',
  },
});

export default AccountTypeScreen;
