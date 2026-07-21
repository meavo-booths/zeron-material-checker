import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        meavo: {
          bg: "#F7F3F0",
          beige: "#EEDCDC",
          "beige-600": "#D9C4C4",
          ink: "#1A1A1A",
          grey: "#6B6B6B",
          accent: "#C45C4A",
          "accent-dark": "#A34A3A",
          success: "#0C8F61",
          warning: "#D97706",
          danger: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Instrument Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
