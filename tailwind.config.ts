import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        folk: "0px",
        "folk-lg": "0px",
        "folk-btn": "var(--folk-button-radius)",
        "folk-input": "var(--folk-input-radius)",
        "folk-modal": "var(--folk-modal-radius)",
        pill: "9999px",
      },
      colors: {
        folk: {
          app: "var(--folk-app)",
          page: "var(--folk-page)",
          surface: "var(--folk-surface)",
          subtle: "var(--folk-muted)",
          nav: "var(--folk-nav)",
          hover: "var(--folk-hover)",
          active: "var(--folk-active)",
          selected: "var(--folk-selected)",
          text: "var(--folk-text)",
          secondary: "var(--folk-text-secondary)",
          tertiary: "var(--folk-text-muted)",
          placeholder: "var(--folk-text-placeholder)",
          border: "var(--folk-border)",
          "border-subtle": "var(--folk-border-subtle)",
          "border-strong": "var(--folk-border-strong)",
        },
        sidebar: {
          bg: "var(--folk-surface)",
          text: "var(--folk-text)",
          muted: "var(--folk-text-muted)",
          hover: "var(--folk-hover)",
          active: "var(--folk-selected)",
          border: "var(--folk-border)",
        },
      },
      transitionDuration: {
        fast: "var(--motion-duration-fast)",
        base: "var(--motion-duration-base)",
        slow: "var(--motion-duration-slow)",
      },
      transitionTimingFunction: {
        out: "var(--motion-ease-out)",
        "in-out": "var(--motion-ease-in-out)",
      },
      boxShadow: {
        folk: "0 4px 24px rgba(0, 0, 0, 0.12)",
        "folk-sm": "0 2px 12px rgba(0, 0, 0, 0.08)",
        "folk-toast": "0 2px 8px rgba(0, 0, 0, 0.10)",
      },
    },
  },
  plugins: [],
}

export default config
