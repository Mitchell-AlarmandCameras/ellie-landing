import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FDFAF5",
          dark:    "#F5EFE4",
          deep:    "#EDE5D8",
        },
        sand: {
          DEFAULT: "#E8DFD0",
          light:   "#F2ECE4",
          dark:    "#C9B99A",
          border:  "#DDD4C5",
        },
        charcoal: {
          DEFAULT: "#2C2C2C",
          light:   "#4A4A4A",
          dark:    "#1A1A1A",
          muted:   "#6B6560",
        },
        blush: {
          DEFAULT: "#C4956A",
          light:   "#D4AB88",
          dark:    "#A67B52",
        },
        taupe:    "#B5A99A",
        warm:     "#8A8580",
      },
      fontFamily: {
        serif:     ["DM Serif Display", "Georgia", "serif"],
        display:   ["DM Serif Display", "Georgia", "serif"],
        body:      ["Inter", "system-ui", "sans-serif"],
        editorial: ["Cormorant Garamond", "Georgia", "serif"],
      },
      letterSpacing: {
        widest: "0.25em",
        ultra:  "0.4em",
        loose:  "0.15em",
      },
      screens: {
        xs: "375px",
      },
      animation: {
        "fade-in": "fadeIn 1s ease-in-out forwards",
        "fade-up": "fadeUp 0.8s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)"    },
        },
      },
    },
  },
  plugins: [],
};

export default config;
