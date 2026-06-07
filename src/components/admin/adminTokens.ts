/** Shared admin dashboard color and typography tokens. */
export const adminColors = {
  pageBg: { light: 'gray.50', dark: 'gray.900' },
  surface: { light: 'white', dark: 'gray.800' },
  border: { light: 'gray.200', dark: 'gray.700' },
  title: { light: 'gray.800', dark: 'whiteAlpha.900' },
  subtitle: { light: 'gray.500', dark: 'gray.400' },
  brand: { light: 'blue.700', dark: 'blue.300' },
  brandMuted: { light: 'blue.50', dark: 'blue.900' },
} as const;

export type AdminAccent = 'blue' | 'emerald' | 'amber' | 'violet' | 'cyan' | 'indigo' | 'rose';

export const adminAccentStyles: Record<
  AdminAccent,
  { accent: string; iconBg: string; iconColor: string }
> = {
  blue: { accent: 'blue.500', iconBg: 'blue.50', iconColor: 'blue.600' },
  emerald: { accent: 'green.500', iconBg: 'green.50', iconColor: 'green.600' },
  amber: { accent: 'orange.400', iconBg: 'orange.50', iconColor: 'orange.600' },
  violet: { accent: 'purple.500', iconBg: 'purple.50', iconColor: 'purple.600' },
  cyan: { accent: 'cyan.500', iconBg: 'cyan.50', iconColor: 'cyan.700' },
  indigo: { accent: 'indigo.500', iconBg: 'indigo.50', iconColor: 'indigo.600' },
  rose: { accent: 'pink.500', iconBg: 'pink.50', iconColor: 'pink.600' },
};
