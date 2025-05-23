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
        }
      },
    },
    plugins: [
      require('tailwind-scrollbar-hide')
    ],
  };