/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['System'],
      },
      colors: {
        zeno: {
          background: '#ffffff',
          backgroundDark: '#000000',
        },
      },
    },
  },
  plugins: [],
};
