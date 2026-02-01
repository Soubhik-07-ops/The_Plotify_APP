/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        rubik: ["Rubik-Regular", "sans-serif"],
        "rubik-bold": ["Rubik-Bold", "sans-serif"],
        "rubik-extrabold": ["Rubik-ExtraBold", "sans-serif"],
        "rubik-medium": ["Rubik-Medium", "sans-serif"],
        "rubik-semibold": ["Rubik-SemiBold", "sans-serif"],
        "rubik-light": ["Rubik-Light", "sans-serif"],
      },
      colors: {
        primary: {
          100: "#8B735520", // soft tint
          200: "#8B735533",
          300: "#8B7355", // subtle neutral brown/taupe
        },
        secondary: {
          300: "#A89B8C", // muted neutral secondary
        },
        surface: {
          100: "#F8F6F3", // warm off-white background
          200: "#FFFFFF", // white cards
          300: "#F5F3F0", // soft cream secondary surfaces
          400: "#FAF9F7", // elevated cards
        },
        border: {
          subtle: "#E5E3E0", // soft light gray
        },
        text: {
          DEFAULT: "#1A1A1A", // near-black primary text
          muted: "#9B9B9B", // muted gray
        },
        black: {
          DEFAULT: "#000000",
          100: "#6B6B6B", // secondary text
          200: "#9B9B9B", // muted text
          300: "#1A1A1A", // primary text (near-black)
        },
        danger: "#D97757", // warm red/orange
      },
    },
  },
  plugins: [],
};
