/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff4ee",
          100: "#ffe6d8",
          400: "#ff9a5c",
          500: "#f97316",
          600: "#e0630b",
        },
      },
    },
  },
  plugins: [],
};
