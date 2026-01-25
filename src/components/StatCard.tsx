import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { useThemeContext } from '../hooks/ThemeContext';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: [string, string];
  onPress?: () => void;
  compact?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  gradient,
  onPress,
  compact = false,
}) => {
  const { isDark } = useThemeContext();
  
  const CardContent = () => (
    <>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, !gradient && { backgroundColor: Colors.gold + '20' }]}>
          <Ionicons name={icon} size={compact ? 18 : 22} color={gradient ? Colors.white : Colors.gold} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.isPositive ? Colors.success + '20' : Colors.danger + '20' }]}>
            <Ionicons 
              name={trend.isPositive ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={trend.isPositive ? Colors.success : Colors.danger} 
            />
            <Text style={[styles.trendText, { color: trend.isPositive ? Colors.success : Colors.danger }]}>
              {trend.value}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, gradient && { color: Colors.white }, compact && styles.valueCompact, !gradient && { color: isDark ? Colors.ivory : Colors.navy }]}>{value}</Text>
      <Text style={[styles.title, gradient && { color: Colors.white + 'CC' }, compact && styles.titleCompact, !gradient && { color: isDark ? Colors.ivory + '99' : Colors.navy + '99' }]}>{title}</Text>
    </>
  );

  const cardStyle = [styles.card, compact && styles.cardCompact];

  if (gradient) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={!onPress}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[cardStyle, styles.gradientCard]}
        >
          <CardContent />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[cardStyle, { backgroundColor: isDark ? '#2A2A2A' : Colors.white }]} 
      onPress={onPress} 
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <CardContent />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  cardCompact: {
    padding: 16,
    borderRadius: 16,
  },
  gradientCard: {
    borderWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 4,
    letterSpacing: -1,
  },
  valueCompact: {
    fontSize: 28,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.navy + '99',
  },
  titleCompact: {
    fontSize: 13,
  },
});
