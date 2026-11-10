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
          50: '#F0F4F8',
          100: '#DCE5EE',
          200: '#B8CEE2',
          300: '#8EB2D4',
          400: '#5587B6',
          500: '#294E70', // Primary: Heritage Blue
          600: '#203E5A',
          700: '#193147',
          800: '#122333',
          900: '#0C1722',
        },
        sidebar: {
          DEFAULT: '#233646', // Dark Surface
          hover: '#2D4457',
          active: '#294E70',
          border: '#1A2935',
          footer: '#1B2A37',
        },
        surface: {
          DEFAULT: '#FFFFFF', // Card / Surface
          muted: '#F8FAFC', // Slate-50 Clean Crisp Background
          subtle: '#F1F5F9', // Slate-100 Soft Surface
          border: '#E2E8F0', // Slate-200 Neutral Clean Border
        },
        ink: {
          DEFAULT: '#24313A', // Main Text
          muted: '#66737C', // Muted Text
          subtle: '#96A4AF',
        },
        status: {
          success: '#294E70',
          'success-soft': '#F0F4F8',
          'success-border': '#B8CEE2',
          warning: '#C6923D',
          'warning-soft': '#FBF5EB',
          'warning-border': '#EEDBB8',
          danger: '#B64545',
          'danger-soft': '#FDF2F2',
          'danger-border': '#F0C2C2',
          info: '#294E70',
          'info-soft': '#EDF2F7',
          'info-border': '#C8D7E6',
        },
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
