import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useThemeContext } from '../hooks/ThemeContext';
import { GradientBackground } from '../components/GradientBackground';
import { useAuthContext } from '../hooks/useAuthStore';

export const ProfileScreen: React.FC = () => {
  const { isDark, toggleTheme } = useThemeContext();
  const { user, logout } = useAuthContext();

  const adminProfile = {
    name: user?.name ?? 'Admin',
    email: user?.email ?? '',
    role: Array.isArray(user?.role) ? user!.role.join(', ') : user?.role ?? '',
    phone: user?.phone ?? '',
  };

  const handleLogout = async () => {
    await logout();
  };

  const ProfileItem = ({
    icon,
    label,
    value,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.profileItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.profileItemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={22} color={Colors.gold} />
        </View>
        <View>
          <Text style={styles.profileItemLabel}>{label}</Text>
          {value && <Text style={styles.profileItemValue}>{value}</Text>}
        </View>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
      )}
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <View style={[styles.header, !isDark && { backgroundColor: Colors.white }]}>
        <Text style={[styles.headerTitle, !isDark && { color: Colors.navy }]}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={48} color={Colors.white} />
          </View>
          <Text style={styles.profileName}>{adminProfile.name}</Text>
          <Text style={styles.profileRole}>{adminProfile.role}</Text>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <ProfileItem
              icon="mail-outline"
              label="Email"
              value={adminProfile.email}
            />
            <ProfileItem
              icon="call-outline"
              label="Phone"
              value={adminProfile.phone}
            />
            <ProfileItem
              icon="briefcase-outline"
              label="Role"
              value={adminProfile.role}
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <ProfileItem
              icon="notifications-outline"
              label="Notification Settings"
              onPress={() => console.log('Notifications')}
            />
            <View style={styles.profileItem}>
              <View style={styles.profileItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="moon" size={22} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.profileItemLabel}>Dark Mode</Text>
                  <Text style={styles.profileItemValue}>{isDark ? 'Enabled' : 'Disabled'}</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: Colors.borderLight, true: Colors.primary + '55' }}
                thumbColor={isDark ? Colors.primary : Colors.white}
              />
            </View>
            <ProfileItem
              icon="lock-closed-outline"
              label="Change Password"
              onPress={() => console.log('Change Password')}
            />
            <ProfileItem
              icon="language-outline"
              label="Language"
              value="English"
              onPress={() => console.log('Language')}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.card}>
            <ProfileItem
              icon="information-circle-outline"
              label="About"
              value="Version 1.0.0"
              onPress={() => console.log('About')}
            />
            <ProfileItem
              icon="document-text-outline"
              label="Terms & Conditions"
              onPress={() => console.log('Terms')}
            />
            <ProfileItem
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => console.log('Privacy')}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Limousine Admin App</Text>
          <Text style={styles.footerSubtext}>© 2025 All rights reserved</Text>
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.ivory,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.navy,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: Colors.gold,
    backgroundColor: Colors.gold + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ivory,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gold + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileItemLabel: {
    fontSize: 14,
    color: Colors.navy + '99',
    marginBottom: 2,
  },
  profileItemValue: {
    fontSize: 16,
    color: Colors.navy,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 16,
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.danger,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.ivory,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.ivory + '80',
    marginTop: 4,
  },
});
