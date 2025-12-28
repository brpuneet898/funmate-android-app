import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const handlePhoneLogin = () => {
    console.log('Phone login pressed');
    // TODO: Navigate to phone login
  };

  const handleEmailLogin = () => {
    console.log('Email login pressed');
    // TODO: Navigate to email login
  };

  const handleCreateAccount = () => {
    navigation.navigate('AccountType');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Text style={styles.appName}>Funmate</Text>
        <Text style={styles.tagline}>Find Fun. Find Friends. Find Love.</Text>
      </View>

      {/* Login Options */}
      <View style={styles.loginSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handlePhoneLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Login with Phone Number</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleEmailLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Login with Email</Text>
        </TouchableOpacity>

        {/* Create Account */}
        <View style={styles.signupSection}>
          <Text style={styles.signupText}>New to Funmate? </Text>
          <TouchableOpacity onPress={handleCreateAccount} activeOpacity={0.7}>
            <Text style={styles.signupLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text style={styles.footerLink}>Terms</Text> &{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  logoSection: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF4458', // Funmate primary color (dating app vibe)
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
    fontWeight: '400',
  },
  loginSection: {
    flex: 2,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  primaryButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF4458',
  },
  secondaryButtonText: {
    color: '#FF4458',
    fontSize: 16,
    fontWeight: '600',
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signupText: {
    fontSize: 15,
    color: '#666666',
  },
  signupLink: {
    fontSize: 15,
    color: '#FF4458',
    fontWeight: '600',
  },
  footer: {
    flex: 0.5,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#FF4458',
    fontWeight: '500',
  },
});

export default LoginScreen;
