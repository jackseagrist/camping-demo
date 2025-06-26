// frontend/tailwind.config.js
module.exports = {
    content: [
      './pages/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
      './app/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {
        height: {
          'screen-minus-header': 'calc(100vh - 64px)',
        },
        keyframes: {
          'bounce-out': {
            '0%': { transform: 'translateY(0) scale(0)', opacity: '0' },
            '50%': { transform: 'translateY(-20px) scale(1.2)', opacity: '1' },
            '100%': { transform: 'translateY(-40px) scale(0.8)', opacity: '0' }
          },
          'float': {
            '0%': { transform: 'translateY(0) rotate(0deg)' },
            '50%': { transform: 'translateY(-10px) rotate(10deg)' },
            '100%': { transform: 'translateY(-20px) rotate(-5deg)', opacity: '0' }
          }
        },
        animation: {
          'bounce-out': 'bounce-out 2s ease-out forwards',
          'float': 'float 2s ease-in-out forwards'
        }
      },
    },
    plugins: [
      require('tailwind-scrollbar-hide')
    ],
  };