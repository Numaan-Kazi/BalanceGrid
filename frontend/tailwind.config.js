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
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7', // Primary accent
          700: '#0369a1', // Primary hover
          800: '#075985',
          900: '#0c4a6e',
        },
        surface: {
          main: '#ffffff',
          muted: '#f8fafc',
          subtle: '#f1f5f9',
          border: '#e2e8f0',
        },
        content: {
          primary: '#1f2937',
          secondary: '#64748b',
          muted: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

