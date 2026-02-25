import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class', // Future-proof; existing [data-theme='dark'] CSS vars still handle theme switching
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        tile: '0 1px 3px rgba(0,0,0,0.05)',
        topbar: '0 1px 0 rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
