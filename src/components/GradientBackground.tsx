import React from 'react';
import { StyleSheet, ViewStyle, StyleProp, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { useThemeContext } from '../hooks/ThemeContext';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const GradientBackground: React.FC<Props> = ({ children, style }) => {
  const { isDark } = useThemeContext();

  // In light mode, use a plain white background
  if (!isDark) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.grey }, style]}>
        {children}
      </View>
    );
  }

  // In dark mode, use the gradient background
  return (
    <LinearGradient
      colors={[Colors.pagenavy, Colors.pagegold]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
