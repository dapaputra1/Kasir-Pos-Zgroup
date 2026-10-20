/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf8f4',
          100: '#d5ede4',
          200: '#aedbcd',
          300: '#7bc1af',
          400: '#4da38e',
          500: '#176B58', // Primary brand color
          600: '#125646',
          700: '#0e4337',
          800: '#0a3128',
          900: '#07221c',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F7F6', // Background
          subtle: '#EEF2F0',
          border: '#E2E8F0',
        },
        ink: {
          DEFAULT: '#17212B', // Main text
          muted: '#4B5563',
          subtle: '#9CA3AF',
        },
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
