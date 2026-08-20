export const darkColors = {
  primary: '#10B981',       // Emerald 500
  primaryHover: '#059669',  // Emerald 600
  primaryLight: 'rgba(16, 185, 129, 0.15)',
  
  background: '#0F172A',    // Slate 900
  surface: '#1E293B',       // Slate 800
  surfaceBorder: '#334155', // Slate 700
  surfaceLight: '#334155',
  
  textPrimary: '#F8FAFC',   // Slate 50
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B',     // Slate 500
  
  accentDonor: '#3B82F6',   // Blue 500
  accentNgo: '#10B981',     // Emerald 500
  accentVol: '#F59E0B',     // Amber 500
  accentAdmin: '#8B5CF6',   // Purple 500
  accentNeeder: '#EC4899',  // Pink 500

  statusAvailable: '#10B981',
  statusClaimed: '#3B82F6',
  statusEnRoute: '#F59E0B',
  statusCompleted: '#10B981',
  statusCancelled: '#EF4444',
  
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const lightColors = {
  primary: '#10B981',
  primaryHover: '#059669',
  primaryLight: 'rgba(16, 185, 129, 0.12)',
  
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceBorder: '#E2E8F0',
  surfaceLight: '#F1F5F9',
  
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  
  accentDonor: '#2563EB',
  accentNgo: '#059669',
  accentVol: '#D97706',
  accentAdmin: '#7C3AED',
  accentNeeder: '#DB2777',

  statusAvailable: '#10B981',
  statusClaimed: '#2563EB',
  statusEnRoute: '#D97706',
  statusCompleted: '#10B981',
  statusCancelled: '#EF4444',
  
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const COLORS = {
  primary: '#10B981',       // Emerald 500
  secondary: '#059669',     // Emerald 600
  background: '#0F172A',    // Slate 900
  surface: '#1E293B',       // Slate 800
  surfaceBorder: '#334155', // Slate 700
  text: '#F8FAFC',          // Slate 50
  textSecondary: '#94A3B8', // Slate 400
  muted: '#64748B',         // Slate 500
  card: '#1E293B',
  border: '#334155',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  accentDonor: '#3B82F6',
  accentNgo: '#10B981',
  accentVol: '#F59E0B',
  accentNeeder: '#EC4899',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const TYPOGRAPHY = {
  fontSizeSm: 12,
  fontSizeMd: 14,
  fontSizeLg: 18,
  fontSizeXl: 24,
  fontWeightBold: '700',
  fontWeightHeavy: '800',
};

export const DIMENSIONS = {
  borderRadiusSm: 8,
  borderRadiusMd: 12,
  borderRadiusLg: 16,
  maxWidthWeb: 1200,
};

export const colors = { ...darkColors };


export function setActiveThemeMode(isDark) {
  const source = isDark ? darkColors : lightColors;
  Object.assign(colors, source);
}

export const themeStyles = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 14,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  }
};
