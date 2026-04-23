/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#0f172a',
        soft: '#1e293b'
      }
    }
  },
  plugins: [],
};
