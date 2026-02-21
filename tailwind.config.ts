import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          DEFAULT: "#5a6b47",
          hover: "#4a5a3a",
        },
        highlight: "#f5e6a6",
        border: "var(--color-border)",
        input: "var(--color-border)",
        ring: "var(--color-primary)",
        background: "var(--color-bg)",
        foreground: "var(--color-text)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--color-bg-muted)",
          foreground: "var(--color-text)",
        },
        muted: {
          DEFAULT: "var(--color-bg-muted)",
          foreground: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-highlight)",
          foreground: "var(--color-text)",
        },
        destructive: "hsl(0 84% 60%)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-button)",
        input: "var(--radius-input)",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-hover)",
        soft: "0 2px 15px -3px rgb(0 0 0 / 0.07), 0 10px 20px -2px rgb(0 0 0 / 0.04)",
        "soft-lg": "0 10px 40px -15px rgb(0 0 0 / 0.1)",
      },
      fontFamily: {
        heebo: ["Heebo", "Assistant", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
