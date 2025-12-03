/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Forced dark mode for this theme usually, but we keep 'class'
  theme: {
    extend: {
      fontFamily: {
        cyber: ['"Orbitron"', '"Inter"', 'sans-serif'], // Suggest adding a sci-fi font
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        neon: {
          cyan: '#00E8FF',
          violet: '#7F5AF0',
          blue: '#00f3ff',
          purple: '#bc13fe',
          green: '#0aff0a',
          red: '#ff003c',
          dark: '#050a14',
        },
        glass: {
          DEFAULT: 'rgba(10, 20, 40, 0.7)',
          border: 'rgba(0, 243, 255, 0.2)',
        },
        cyan: {
          400: '#00f3ff',
          300: '#33f5ff',
        },
        magenta: {
          400: '#ff00ff',
          300: '#ff33ff',
        },
        violet: {
          400: '#bc13fe',
          300: '#cc33fe',
        },
        yellow: {
          400: '#fbbf24',
          300: '#fcd34d',
        },
      },
      boxShadow: {
        'cyber': '0 30px 80px rgba(4, 8, 13, 0.6)',
        'neon-blue': '0 0 20px rgba(0, 243, 255, 0.3), inset 0 0 10px rgba(0, 243, 255, 0.1)',
        'neon-red': '0 0 20px rgba(255, 0, 60, 0.3), inset 0 0 10px rgba(255, 0, 60, 0.1)',
        'neon-input': '0 0 15px rgba(0, 243, 255, 0.15)',
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, rgba(5,10,20,0.95) 0%, rgba(10,20,40,0.95) 100%)',
      },
      animation: {
        'spin-slow': 'spin 10s linear infinite',
        'pulse-fast': 'pulse 1.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'glitch': 'glitch 1s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
        }
      },
    },
  },
  plugins: [],
};