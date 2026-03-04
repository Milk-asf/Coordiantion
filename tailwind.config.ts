import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        sidebar: {
          bg: "#f5f5f5",
          text: "#3d3d3d",
          muted: "#888888",
          hover: "#ebebeb",
          active: "#ebebeb",
          border: "#dcdcdc",
        },
      },
    },
  },
  plugins: [],
}

export default config
