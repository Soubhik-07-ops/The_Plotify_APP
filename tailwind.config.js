/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        playfair: ["PlayfairDisplay-Regular", "serif"],
        "playfair-bold": ["PlayfairDisplay-Bold", "serif"],
        "playfair-medium": ["PlayfairDisplay-Medium", "serif"],
        "playfair-semibold": ["PlayfairDisplay-SemiBold", "serif"],
        inter: ["Inter-Regular", "sans-serif"],
        "inter-medium": ["Inter-Medium", "sans-serif"],
        "inter-semibold": ["Inter-SemiBold", "sans-serif"],
        "inter-bold": ["Inter-Bold", "sans-serif"],
      },
      colors: {
        primary: {
          100: "#8B6B4A1A",
          200: "#8B6B4A33",
          300: "#8B6B4A", // main accent
        },
        secondary: {
          300: "#F4EFE9", // soft background
        },
        surface: {
          100: "#F8F6F3", // screen background
          200: "#FFFFFF", // cards
          300: "#F4EFE9", // muted surfaces
          400: "#FFFFFF", // elevated cards
        },
        border: {
          subtle: "#E6E0D8", // neutral border
        },
        text: {
          DEFAULT: "#1F1F1F",
          muted: "#6B6B6B",
        },
        black: {
          DEFAULT: "#1F1F1F",
          100: "#6B6B6B", // secondary text
          200: "#9C8F80", // muted text
          300: "#1F1F1F", // primary text
        },
        danger: "#EF4444",
        accent: "#C7A97C",
        success: "#4CAF50",
      },
    },
  },
  plugins: [],
};
