// Modern neutral dark theme (matching customer app)
const Navy = '#1A1A1A';
const Gold = '#22C55E';  // Green accent
const Ivory = '#F5F5F5';
const White = '#ffffff';
const PageNavy = 'rgba(26, 26, 26, 0.92)';
const PageGold = 'rgba(34, 197, 94, 0.5)';

export const Colors = {
  // Brand / primary accents
  primary: Gold,
  secondary: Ivory,
  info: '#3b82f6',
  success: '#22C55E',
  warning: '#f59e0b',
  danger: '#ef4444',

  // Status colors (retain existing semantics)
  pending: '#f59e0b',
  assigned: '#22C55E',
  inProgress: '#3b82f6',
  completed: '#6b7280',
  cancelled: '#ef4444',
  sos: '#dc2626',

  // Backgrounds
  background: Navy,
  pageOverlayNavy: PageNavy,
  pageOverlayGold: PageGold,
  cardBackground: White, // keep cards readable on dark background

  // Text
  text: Ivory,
  textSecondary: White,
  textLight: 'rgba(245, 245, 245, 0.7)',

  // Borders / shadows
  border: 'rgba(245, 245, 245, 0.14)',
  borderLight: 'rgba(245, 245, 245, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.25)',

  // Base
  white: White,
  grey: '#e3e6eb',
  black: '#000000',

  // Named brand colors for direct use
  navy: Navy,
  gold: Gold,
  ivory: Ivory,
  pagenavy: PageNavy,
  pagegold: PageGold,
};

// Light mode palette
export const LightColors = {
  primary: '#22C55E',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22C55E',
  info: '#3b82f6',

  pending: '#f59e0b',
  assigned: '#22C55E',
  inProgress: '#3b82f6',
  completed: '#6b7280',
  cancelled: '#ef4444',
  sos: '#dc2626',

  background: '#F5F5F5',
  cardBackground: '#ffffff',

  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#9ca3af',

  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  white: '#ffffff',
  black: '#000000',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Alias to match requested naming without breaking current imports
export const COLORS = Colors;
