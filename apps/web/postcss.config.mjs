// Tailwind v4 CSS-first: el único cableado es este plugin de PostCSS.
// NO existe tailwind.config.js — los tokens viven en src/app/globals.css.
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
