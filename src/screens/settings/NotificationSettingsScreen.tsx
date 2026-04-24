/**
 * Notification Settings Screen
 *
 * Allows users to toggle different notification types:
 * - Likes
 * - Matches
 * - Messages
 * - Events
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  ImageBackground,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import notificationService from '../../services/NotificationService';
import { useAlert } from '../../contexts/AlertContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationSettings {
  likes: boolean;
  matches: boolean;
  messages: boolean;
  events: boolean;
}

interface NotificationSettingsScreenProps {
  navigation: any;
}

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({
  navigation,
}) => {
  const { showError } = useAlert();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<NotificationSettings>({
    likes: true,
    matches: true,
    messages: true,
    events: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = await notificationService.getSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      showError('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (
    key: keyof NotificationSettings,
    value: boolean,
  ) => {
    const newSettings = {...settings, [key]: value};
    setSettings(newSettings);

    try {
      setSaving(true);
      await notificationService.updateSettings({[key]: value});
    } catch (error) {
      // Revert on error
      setSettings(settings);
      showError('Error', 'Failed to update setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const SettingRow: React.FC<{
    title: string;
    description: string;
    value: boolean;
    settingKey: keyof NotificationSettings;
    iconName: string;
    iconColor: string;
  }> = ({title, description, value, settingKey, iconName, iconColor}) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={iconName as any} size={24} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => handleToggle(settingKey, newValue)}
        trackColor={{false: 'rgba(255,255,255,0.18)', true: '#8B2BE2'}}
        thumbColor={value ? '#06B6D4' : '#FFFFFF'}
        ios_backgroundColor="rgba(255,255,255,0.18)"
        disabled={saving}
      />
    </View>
  );

  if (loading) {
    return (
      <ImageBackground
        source={require('../../assets/images/bg_party.webp')}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/bg_party.webp')}
      style={styles.container}
      resizeMode="cover"
      blurRadius={10}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(32, insets.bottom + 24) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Section Header */}
          <Text style={styles.sectionHeader}>Manage Preferences</Text>
          <Text style={styles.sectionSubheader}>
            Choose which notifications you want to receive
          </Text>

          {/* Settings */}
          <View style={styles.settingsCard}>
            <SettingRow
              title="Likes"
              description="When someone likes your profile"
              value={settings.likes}
              settingKey="likes"
              iconName="heart"
              iconColor="#FF4D6D"
            />

            <View style={styles.divider} />

            <SettingRow
              title="Matches"
              description="When you match with someone"
              value={settings.matches}
              settingKey="matches"
              iconName="heart-circle"
              iconColor="#A855F7"
            />

            <View style={styles.divider} />

            <SettingRow
              title="Messages"
              description="When you receive a new message"
              value={settings.messages}
              settingKey="messages"
              iconName="chatbubbles"
              iconColor="#06B6D4"
            />

            <View style={styles.divider} />

            <SettingRow
              title="Events"
              description="Event reminders and updates"
              value={settings.events}
              settingKey="events"
              iconName="calendar"
              iconColor="#06B6D4"
            />
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Ionicons name="information-circle" size={20} color="#22D3EE" style={styles.infoIconStyle} />
            <Text style={styles.infoText}>
              You can also manage notification settings in your device's system
              settings. Some notifications like security alerts cannot be
              disabled.
            </Text>
          </View>

          {/* Saving Indicator */}
          {saving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color="#06B6D4" />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 30, 0.60)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    marginBottom: 6,
  },
  sectionSubheader: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    marginBottom: 22,
  },
  settingsCard: {
    backgroundColor: 'rgba(26,21,48,0.78)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.30)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 3,
  },
  settingDescription: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginLeft: 72,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26,21,48,0.78)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.30)',
  },
  infoIconStyle: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontFamily: 'Inter-Regular',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  savingText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Inter-Medium',
  },
});

export default NotificationSettingsScreen;
