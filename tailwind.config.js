/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      boxShadow: {
        clinic: '0 8px 24px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
