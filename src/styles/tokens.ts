/**
 * Design tokens – pazatsta.co.il style
 * Use these in Tailwind via CSS variables and theme extension.
 */
export const tokens = {
  colors: {
    primary: "var(--color-primary)",
    primaryHover: "var(--color-primary-hover)",
    highlight: "var(--color-highlight)",
    bg: "var(--color-bg)",
    bgMuted: "var(--color-bg-muted)",
    text: "var(--color-text)",
    textMuted: "var(--color-text-muted)",
    border: "var(--color-border)",
    white: "#ffffff",
  },
  radius: {
    card: "var(--radius-card)",
    button: "var(--radius-button)",
    input: "var(--radius-input)",
  },
  shadow: {
    card: "var(--shadow-card)",
    hover: "var(--shadow-hover)",
  },
} as const;

/** Olive/green and yellow hex values for reference */
export const olive = {
  DEFAULT: "#5a6b47",
  hover: "#4a5a3a",
};
export const highlightYellow = "#f5e6a6";
