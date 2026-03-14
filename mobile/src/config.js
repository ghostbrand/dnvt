// DNVT Brand color palette — matches web frontend
export const COLORS = {
  // Primary brand — Navy Blue
  purple: '#1B2A4A',
  purpleLight: '#2B4075',
  pink: '#E91E63',
  pinkLight: '#F472B6',
  
  // Secondary colors
  blue: '#2563EB',
  blueLight: '#3B82F6',
  cyan: '#26A69A',
  cyanLight: '#5EEAD4',
  
  // Accent colors
  orange: '#FF9800',
  orangeLight: '#FBBF24',
  yellow: '#FFEB3B',
  yellowLight: '#FEF08A',
  green: '#4CAF50',
  greenLight: '#86EFAC',
  red: '#E53935',
  redLight: '#F87171',
  
  // Neutral
  white: '#FFFFFF',
  black: '#0F172A',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayDark: '#374151',
  
  // Background gradients
  bgPrimary: '#1B2A4A',
  bgSecondary: '#2563EB',
  bgDark: '#0F172A',
};

// Kahoot-style shadows and effects
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 8,
  },
  colored: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  }),
};

// Button variants - Kahoot style
export const BUTTON_STYLES = {
  primary: {
    backgroundColor: COLORS.purple,
    borderBottomColor: '#0F172A',
    borderBottomWidth: 4,
  },
  secondary: {
    backgroundColor: COLORS.blue,
    borderBottomColor: '#1D4ED8',
    borderBottomWidth: 4,
  },
  success: {
    backgroundColor: COLORS.green,
    borderBottomColor: '#2E7D32',
    borderBottomWidth: 4,
  },
  danger: {
    backgroundColor: COLORS.red,
    borderBottomColor: '#B71C1C',
    borderBottomWidth: 4,
  },
  warning: {
    backgroundColor: COLORS.orange,
    borderBottomColor: '#E65100',
    borderBottomWidth: 4,
  },
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font sizes
export const FONTS = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  giant: 48,
};

// Border radius
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};
