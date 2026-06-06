export const colors = {
  background: '#F7F2EC',
  surface: '#FFFDF9',
  surfaceWarm: '#FBF5EE',
  surfaceMuted: '#EFE6DD',
  border: '#E7D9CB',
  borderStrong: '#D8C6B6',
  text: '#211C18',
  textMuted: '#6F6258',
  textSubtle: '#8A7B70',
  accent: '#B25B31',
  accentPressed: '#7A3B22',
  accentSoft: '#F1D8C7',
  success: '#2F6F5D',
  successSoft: '#E4F1E8',
  danger: '#B33F2F',
  dangerSoft: '#FBE8E3',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
} as const;

export const type = {
  eyebrow: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    lineHeight: 39,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#3D2B20',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  floating: {
    shadowColor: '#3D2B20',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 5,
  },
} as const;
