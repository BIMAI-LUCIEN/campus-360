import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "oklch(0.9538 0.0289 55)",
          100: "oklch(0.9254 0.0264 90.1)",
          200: "oklch(0.8459 0.0524 51)",
          300: "oklch(0.7557 0.1121 52.2)",
          400: "oklch(0.6459 0.1421 45)",
          500: "oklch(0.5351 0.1625 39.5)",
          600: "oklch(0.4859 0.1521 39.5)",
          700: "oklch(0.4367 0.1331 39.3)",
          800: "oklch(0.3559 0.109 39)",
          900: "oklch(0.2867 0.0871 39)",
          950: "oklch(0.2077 0.0398 265.8)",
        },
        emerald: {
          50: "oklch(0.9426 0.0492 162)",
          500: "oklch(0.5081 0.1049 165.6)",
          600: "oklch(0.4318 0.0865 166.9)",
          400: "oklch(0.6959 0.1491 162.5)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          light: "var(--color-ink-light)",
          lighter: "var(--color-ink-lighter)",
        },
        border: {
          DEFAULT: "var(--color-border)",
        },
        paper: {
          DEFAULT: "var(--color-paper)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
