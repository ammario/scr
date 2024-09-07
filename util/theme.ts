export const colors = {
  // Base colors
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  foregroundDark: "#c0c0c0",

  // Accent colors
  accent: "#1279ce",
  accentLight: "#9cdcfe",
  accentDark: "#264f78",

  h1: "#008cff",

  // Semantic colors
  success: "#17932e", // A more muted green
  warning: "#ffb12c",
  error: "#f44747",
  comment: "#6a9955",

  // Additional colors
  white: "#ffffff",
  black: "#000000",

  // Derived colors
  backgroundTransparent: "#ffffff", // Used in textarea background
};

export const borderRadius = "2px";
export const buttonBorderRadius = "4px";

export const colorMixins = {
  textareaBackground: `color-mix(in srgb, ${colors.background} 90%, ${colors.backgroundTransparent})`,
  selectBackground: `color-mix(in srgb, ${colors.background} 90%, ${colors.backgroundTransparent})`,
  hrBackground: `color-mix(in srgb, ${colors.background} 70%, ${colors.backgroundTransparent})`,
};
