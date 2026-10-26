/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#132830',
    tint: '#F4A900',
    background: '#F6F2E8',
    foreground: '#132830',
    card: '#FFFDF7',
    cardForeground: '#132830',
    primary: '#F4A900',
    primaryForeground: '#172A31',
    secondary: '#E8EEE9',
    secondaryForeground: '#24434A',
    muted: '#EDE9DE',
    mutedForeground: '#6C7774',
    accent: '#DDF1EC',
    accentForeground: '#1D5D5B',
    destructive: '#A84335',
    destructiveForeground: '#FFF9F0',
    border: '#DDD9CD',
    input: '#D6D3C8',
    navy: '#10272E',
    teal: '#197C79',
    gold: '#F4A900',
  },
  radius: 18,
};

export default colors;
