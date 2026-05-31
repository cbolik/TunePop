/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        spotify: '#1DB954',
        'spotify-dark': '#158a3e',
        surface: '#121212',
        card: '#282828',
        'card-hover': '#3E3E3E',
      },
      keyframes: {
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        'flash-correct': {
          '0%, 100%': { backgroundColor: '#282828' },
          '50%': { backgroundColor: '#1DB954' },
        },
        'flash-wrong': {
          '0%, 100%': { backgroundColor: '#282828' },
          '50%': { backgroundColor: '#ef4444' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'bounce-dot': 'bounce-dot 1.2s infinite ease-in-out',
        'flash-correct': 'flash-correct 0.6s ease-in-out',
        'flash-wrong': 'flash-wrong 0.6s ease-in-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
