/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './assets/js/*.js'],
  theme: {
    extend: {
      colors: {
        // Stella Group binafsha palitrasi. 600 — logotip foni, 700 va 500 — brif ranglari.
        // Ranglar CSS o'zgaruvchilari orqali beriladi — qiymatlari (tungi va kunduzgi rejim uchun)
        // src/input.css oxiridagi "Mavzu ranglari" bo'limida.
        brand: {
          50: 'rgb(var(--b-50) / <alpha-value>)',
          100: 'rgb(var(--b-100) / <alpha-value>)',
          200: 'rgb(var(--b-200) / <alpha-value>)',
          300: 'rgb(var(--b-300) / <alpha-value>)',
          400: 'rgb(var(--b-400) / <alpha-value>)',
          500: 'rgb(var(--b-500) / <alpha-value>)',
          600: 'rgb(var(--b-600) / <alpha-value>)',
          700: 'rgb(var(--b-700) / <alpha-value>)',
          800: 'rgb(var(--b-800) / <alpha-value>)',
          900: 'rgb(var(--b-900) / <alpha-value>)',
          950: 'rgb(var(--b-950) / <alpha-value>)',
        },
        // "white" — asosiy matn/chiziq rangi: tungi rejimda oq, kunduzgi rejimda to'q binafsha.
        white: 'rgb(var(--c-white) / <alpha-value>)',
        neon: {
          200: 'rgb(var(--n-200) / <alpha-value>)',
          300: 'rgb(var(--n-300) / <alpha-value>)',
          400: 'rgb(var(--n-400) / <alpha-value>)',
          500: '#9A5CFF',
          600: '#7C3AED',
        },
        star: '#FFD23F',
      },
      fontFamily: {
        display: ['Montserrat', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        site: '78rem',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'marquee-rev': {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(0)' },
        },
        flicker: {
          '0%, 6%, 9%, 14%, 22%, 100%': { opacity: '1' },
          '3%, 8%, 12%, 18%': { opacity: '.35' },
        },
        ping2: {
          '0%': { transform: 'scale(1)', opacity: '.7' },
          '80%, 100%': { transform: 'scale(var(--ping-scale, 2.4))', opacity: '0' },
        },
      },
      animation: {
        marquee: 'marquee var(--marquee-time, 40s) linear infinite',
        'marquee-rev': 'marquee-rev var(--marquee-time, 40s) linear infinite',
        flicker: 'flicker 2.2s linear 1 both',
        ping2: 'ping2 1.8s cubic-bezier(0,0,.2,1) infinite',
      },
    },
  },
  plugins: [],
};
