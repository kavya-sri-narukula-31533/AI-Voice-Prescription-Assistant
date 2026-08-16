import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#1a56db",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        medical: {
          green:  "#10b981",
          red:    "#ef4444",
          amber:  "#f59e0b",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        "slide-in":   "slideIn 0.3s ease-out",
        "fade-in":    "fadeIn 0.2s ease-out",
      },
      keyframes: {
        "pulse-ring": {
          "0%":   { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(239,68,68,0.7)" },
          "70%":  { transform: "scale(1)",    boxShadow: "0 0 0 10px rgba(239,68,68,0)" },
          "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(239,68,68,0)" },
        },
        slideIn: {
          from: { transform: "translateY(-10px)", opacity: "0" },
          to:   { transform: "translateY(0)",     opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
