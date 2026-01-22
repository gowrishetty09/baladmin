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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useThemeContext } from '../hooks/ThemeContext';
import { useAuthContext } from '../hooks/useAuthStore';

export const ProfileScreen: React.FC = () => {
  const { isDark, toggleTheme } = useThemeContext();
  const { user, logout } = useAuthContext();
  const insets = useSafeAreaInsets();

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
    <View style={[styles.container, { backgroundColor: isDark ? Colors.navy : '#F5F7FA' }]}>
      {/* Modern Gradient Header with Avatar */}
      <LinearGradient
        colors={isDark ? [Colors.navy, Colors.navy + 'EE'] : [Colors.navy, '#1E3A5F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>Profile</Text>
        
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={48} color={Colors.white} />
          </View>
          <Text style={styles.profileName}>{adminProfile.name}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.gold} />
            <Text style={styles.profileRole}>{adminProfile.role}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

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
          <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, !isDark && { color: Colors.navy + '99' }]}>Limousine Admin App</Text>
          <Text style={[styles.footerSubtext, !isDark && { color: Colors.navy + '66' }]}>© 2025 All rights reserved</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 4,
    borderColor: Colors.white + '30',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold + '20',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  profileRole: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '600',
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
    marginTop: -10,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy + '80',
    marginBottom: 10,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    borderRadius: 12,
    backgroundColor: Colors.gold + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileItemLabel: {
    fontSize: 12,
    color: Colors.navy + '80',
    marginBottom: 2,
  },
  profileItemValue: {
    fontSize: 15,
    color: Colors.navy,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    paddingVertical: 16,
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 14,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '700',
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
