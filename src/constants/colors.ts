// Dark mode palette (default)
const Navy = '#151e2d';
const Gold = '#bd9250';
const Ivory = '#f6f2ea';
const White = '#ffffff';
const PageNavy = 'rgba(21, 30, 45, 0.2)';
const PageGold = 'rgba(189, 146, 80, 0.2)';

export const Colors = {
  // Brand / primary accents
  primary: Gold,
  secondary: Ivory,
  info: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',

  // Status colors (retain existing semantics)
  pending: '#f59e0b',
  assigned: '#10b981',
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
  textLight: 'rgba(246, 242, 234, 0.7)',

  // Borders / shadows
  border: 'rgba(246, 242, 234, 0.14)',
  borderLight: 'rgba(246, 242, 234, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.25)',

  // Base
  white: White,
  grey: '#e3e6ebff,',
  black: '#000000',

  // Named brand colors for direct use
  navy: Navy,
  gold: Gold,
  ivory: Ivory,
  pagenavy: PageNavy,
  pagegold: PageGold,
};

// Light mode palette (current design)
export const LightColors = {
  primary: '#2563eb',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',

  pending: '#f59e0b',
  assigned: '#10b981',
  inProgress: '#3b82f6',
  completed: '#6b7280',
  cancelled: '#ef4444',
  sos: '#dc2626',

  background: '#f8fafc',
  cardBackground: '#ffffff',

  text: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',

  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  white: '#ffffff',
  black: '#000000',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Alias to match requested naming without breaking current imports
export const COLORS = Colors;
