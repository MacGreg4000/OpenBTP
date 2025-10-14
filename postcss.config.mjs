/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    'tailwindcss': {},
    'postcss-preset-env': {
      features: {
        'nesting-rules': true,
        'is-pseudo-class': false // Désactiver la transformation des sélecteurs :is()
      }
    },
    'autoprefixer': {}
  },
};

export default config;
