import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#000080",
          dark: "#000060",
          light: "#0000aa",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light: "#e8c84d",
          dark: "#b8952e",
          pale: "#f5e9b8",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Cormorant Garamond", "Garamond", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest: "0.25em",
        ultra: "0.4em",
        ultra2: "0.35em",
      },
      screens: {
        // Samsung Galaxy S26 Ultra portrait: ~412px
        // Ensure xs breakpoint covers it
        xs: "375px",
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, #D4AF37 0%, #f5e9b8 50%, #D4AF37 100%)",
        "navy-gradient":
          "linear-gradient(135deg, #000060 0%, #000080 50%, #0000aa 100%)",
      },
      animation: {
        "fade-in": "fadeIn 1s ease-in-out forwards",
        "fade-up": "fadeUp 0.8s ease-out forwards",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
