/**
 * The entire visual language. Off-white, near-black, one dark blue-green
 * accent. Generous whitespace. No animations, no gradients.
 */
export const colors = {
  background: '#F7F6F2',
  text: '#16181A',
  textMuted: '#6E7472',
  accent: '#14554C',
  accentText: '#F7F6F2',
  border: '#E4E2DB',
  surface: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 40,
  xxl: 64,
} as const;

export const type = {
  title: { fontSize: 28, fontWeight: '600', color: colors.text } as const,
  heading: { fontSize: 17, fontWeight: '600', color: colors.text } as const,
  body: { fontSize: 17, lineHeight: 26, color: colors.text } as const,
  caption: { fontSize: 13, lineHeight: 18, color: colors.textMuted } as const,
} as const;
