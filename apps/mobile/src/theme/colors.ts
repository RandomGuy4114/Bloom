export const STANDARD_THEMES = ['light', 'dark'] as const;
export const SUPPORTER_THEMES = ['forest', 'midnight', 'sunset', 'frutiger-aero'] as const;
export type ThemeName = (typeof STANDARD_THEMES)[number] | (typeof SUPPORTER_THEMES)[number];

export function availableThemes(supporter: boolean): ThemeName[] {
  return supporter ? [...STANDARD_THEMES, ...SUPPORTER_THEMES] : [...STANDARD_THEMES];
}

export const lightColors = {
  primary: '#9CB080',
  primaryDark: '#70885F',
  primaryPressed: '#7F966F',
  primarySoft: '#E7ECE8',
  primaryTint: '#9cb08051',

  background: '#F3F6F2',
  backgroundAlt: '#DCE5DA',
  surface: '#FFFFFF',
  surfaceAlt: '#F9F9F9',
  inputBackground: '#F8FAF8',

  border: '#DDE4DD',
  borderStrong: '#E0E5E0',
  borderSoft: '#D8DFD9',
  borderInput: '#D5DDD5',
  divider: '#E0E0E0',

  textPrimary: '#26342B',
  textSecondary: '#536057',
  textMuted: '#657368',
  textFaint: '#737C76',
  textPlaceholder: '#8B948D',
  textOnPrimary: '#FFFFFF',

  tabInactive: '#7A8179',

  danger: '#C94F4F',
  dangerText: '#923F3F',
  dangerBackground: '#FBEAEA',
  warning: '#D5A928',
  success: '#7F9B6D',

  like: '#A94456',
  supporterGold: '#B28B22',
  supporterGoldFill: '#E4BD4C',

  chipInactive: '#E3E7E2',
  chipInactiveText: '#536057',
} as const;

export type ColorToken = keyof typeof lightColors;

export type ThemePalette = Record<ColorToken, string>;

/** Backwards-compat alias — prefer `useTheme().colors` instead of importing this directly. */
export const colors = lightColors;

export const darkColors: ThemePalette = {
  primary: '#9CB080',
  primaryDark: '#B7C9A2',
  primaryPressed: '#84996F',
  primarySoft: '#28352A',
  primaryTint: '#9cb08040',

  background: '#141713',
  backgroundAlt: '#1D211C',
  surface: '#1E221D',
  surfaceAlt: '#242820',
  inputBackground: '#242820',

  border: '#2C332A',
  borderStrong: '#333B30',
  borderSoft: '#2A312A',
  borderInput: '#333B30',
  divider: '#2C332A',

  textPrimary: '#EDF1EA',
  textSecondary: '#C1CBBC',
  textMuted: '#A2AC9D',
  textFaint: '#8B9587',
  textPlaceholder: '#6E786B',
  textOnPrimary: '#14171A',

  tabInactive: '#7C867A',

  danger: '#E27575',
  dangerText: '#F0A6A6',
  dangerBackground: '#3A2323',
  warning: '#E4C25C',
  success: '#96B583',

  like: '#D97187',
  supporterGold: '#E4BD4C',
  supporterGoldFill: '#F0D384',

  chipInactive: '#282E25',
  chipInactiveText: '#C1CBBC',
};

export const forestColors: ThemePalette = {
  primary: '#3FA66B',
  primaryDark: '#2C7D4F',
  primaryPressed: '#358F5B',
  primarySoft: '#1B3826',
  primaryTint: '#3fa66b40',

  background: '#0E1912',
  backgroundAlt: '#132318',
  surface: '#152A1C',
  surfaceAlt: '#1A311F',
  inputBackground: '#1A311F',

  border: '#20402A',
  borderStrong: '#274A32',
  borderSoft: '#1E3927',
  borderInput: '#274A32',
  divider: '#20402A',

  textPrimary: '#E7F5EB',
  textSecondary: '#B4D6BF',
  textMuted: '#93B89E',
  textFaint: '#7DA187',
  textPlaceholder: '#5F8268',
  textOnPrimary: '#08130D',

  tabInactive: '#6E9179',

  danger: '#E2786B',
  dangerText: '#F0A99E',
  dangerBackground: '#3A2420',
  warning: '#E0C25A',
  success: '#5FCB86',

  like: '#E27691',
  supporterGold: '#E9C75C',
  supporterGoldFill: '#F3DA8B',

  chipInactive: '#1D3524',
  chipInactiveText: '#B4D6BF',
};

export const midnightColors: ThemePalette = {
  primary: '#7C93E0',
  primaryDark: '#5A72C4',
  primaryPressed: '#6D85D6',
  primarySoft: '#1E2440',
  primaryTint: '#7c93e040',

  background: '#0A0D1F',
  backgroundAlt: '#101430',
  surface: '#131938',
  surfaceAlt: '#171E42',
  inputBackground: '#171E42',

  border: '#232B4E',
  borderStrong: '#2A3359',
  borderSoft: '#1F2748',
  borderInput: '#2A3359',
  divider: '#232B4E',

  textPrimary: '#E9ECFB',
  textSecondary: '#B7C0EA',
  textMuted: '#98A3D6',
  textFaint: '#8189B8',
  textPlaceholder: '#636B99',
  textOnPrimary: '#080A18',

  tabInactive: '#767FB0',

  danger: '#E9808A',
  dangerText: '#F3AAB1',
  dangerBackground: '#331F2C',
  warning: '#E8C767',
  success: '#79CBA6',

  like: '#E981A8',
  supporterGold: '#E8C767',
  supporterGoldFill: '#F2DA96',

  chipInactive: '#1B2145',
  chipInactiveText: '#B7C0EA',
};

export const sunsetColors: ThemePalette = {
  primary: '#E8804F',
  primaryDark: '#C7623A',
  primaryPressed: '#DB7548',
  primarySoft: '#3A2419',
  primaryTint: '#e8804f40',

  background: '#1C1017',
  backgroundAlt: '#25141C',
  surface: '#2A1720',
  surfaceAlt: '#331B25',
  inputBackground: '#331B25',

  border: '#432434',
  borderStrong: '#4E2A3B',
  borderSoft: '#3D2130',
  borderInput: '#4E2A3B',
  divider: '#432434',

  textPrimary: '#FBEDEA',
  textSecondary: '#E3BCC0',
  textMuted: '#C99BA1',
  textFaint: '#B08289',
  textPlaceholder: '#8C6469',
  textOnPrimary: '#1C0E0A',

  tabInactive: '#B0808C',

  danger: '#EF7A7A',
  dangerText: '#F5ACAC',
  dangerBackground: '#3D2222',
  warning: '#F0B94E',
  success: '#9CC97A',

  like: '#F0678F',
  supporterGold: '#F0B94E',
  supporterGoldFill: '#F7D488',

  chipInactive: '#331C26',
  chipInactiveText: '#E3BCC0',
};

export const frutigerAeroColors: ThemePalette = {
  primary: '#0FA3B1',
  primaryDark: '#0B7C88',
  primaryPressed: '#0D8F9C',
  primarySoft: '#DFF6F8',
  primaryTint: '#0fa3b140',

  background: '#EAFBFD',
  backgroundAlt: '#D3F1F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F2FCFD',
  inputBackground: '#F2FCFD',

  border: '#C3ECF1',
  borderStrong: '#AEE4EB',
  borderSoft: '#D3F1F6',
  borderInput: '#B9E7ED',
  divider: '#C3ECF1',

  textPrimary: '#0B3A44',
  textSecondary: '#276572',
  textMuted: '#3E7C88',
  textFaint: '#5A939E',
  textPlaceholder: '#7EABB3',
  textOnPrimary: '#FFFFFF',

  tabInactive: '#6FA6AF',

  danger: '#E0555F',
  dangerText: '#B03039',
  dangerBackground: '#FDE7E8',
  warning: '#E8AC1F',
  success: '#2FAE7C',

  like: '#F0567F',
  supporterGold: '#D9A315',
  supporterGoldFill: '#F3CE55',

  chipInactive: '#DCF3F5',
  chipInactiveText: '#276572',
};

export const themePalettes: Record<ThemeName, ThemePalette> = {
  light: lightColors,
  dark: darkColors,
  forest: forestColors,
  midnight: midnightColors,
  sunset: sunsetColors,
  'frutiger-aero': frutigerAeroColors,
};
