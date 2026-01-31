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
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import notificationService from '../../services/NotificationService';

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
      Alert.alert('Error', 'Failed to load notification settings');
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
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const SettingRow: React.FC<{
    title: string;
    description: string;
    value: boolean;
    settingKey: keyof NotificationSettings;
    icon: string;
  }> = ({title, description, value, settingKey, icon}) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => handleToggle(settingKey, newValue)}
        trackColor={{false: '#3e3e3e', true: '#FF4458'}}
        thumbColor={value ? '#FFFFFF' : '#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
        disabled={saving}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4458" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section Header */}
        <Text style={styles.sectionHeader}>Push Notifications</Text>
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
            icon="❤️"
          />

          <View style={styles.divider} />

          <SettingRow
            title="Matches"
            description="When you match with someone"
            value={settings.matches}
            settingKey="matches"
            icon="💘"
          />

          <View style={styles.divider} />

          <SettingRow
            title="Messages"
            description="When you receive a new message"
            value={settings.messages}
            settingKey="messages"
            icon="💬"
          />

          <View style={styles.divider} />

          <SettingRow
            title="Events"
            description="Event reminders and updates"
            value={settings.events}
            settingKey="events"
            icon="🎉"
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            You can also manage notification settings in your device's system
            settings. Some notifications like security alerts cannot be
            disabled.
          </Text>
        </View>

        {/* Saving Indicator */}
        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color="#FF4458" />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubheader: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 20,
  },
  settingsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    color: '#8E8E93',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginLeft: 72,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  savingText: {
    color: '#8E8E93',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default NotificationSettingsScreen;
