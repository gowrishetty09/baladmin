import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useThemeContext } from '../hooks/ThemeContext';

interface ActivityItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
  onPress?: () => void;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  icon,
  iconColor,
  title,
  subtitle,
  time,
  onPress,
}) => {
  const { isDark } = useThemeContext();
  
  return (
    <TouchableOpacity 
      style={[styles.container, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.navy + '08' }]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? Colors.ivory : Colors.navy }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.subtitle, { color: isDark ? Colors.ivory + '70' : Colors.navy + '70' }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={[styles.time, { color: isDark ? Colors.ivory + '50' : Colors.navy + '50' }]}>{time}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navy + '08',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.navy + '70',
  },
  time: {
    fontSize: 11,
    color: Colors.navy + '50',
    fontWeight: '500',
  },
});
