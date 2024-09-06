export const colors = {
  // Base colors
  background: "#1e1e1e",
  foreground: "#d4d4d4",

  // Accent colors
  accent: "#1279ce",
  accentLight: "#9cdcfe",
  accentDark: "#264f78",

  // Semantic colors
  success: "#4caf50", // A more muted green
  warning: "#d7ba7d",
  error: "#f44747",
  comment: "#6a9955",

  // Additional colors
  white: "#ffffff",
  black: "#000000",

  // Derived colors
  backgroundTransparent: "#ffffff", // Used in textarea background
};

export const colorMixins = {
  textareaBackground: `color-mix(in srgb, ${colors.background} 90%, ${colors.backgroundTransparent})`,
  hrBackground: `color-mix(in srgb, ${colors.background} 70%, ${colors.backgroundTransparent})`,
};