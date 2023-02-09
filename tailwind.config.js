const defaultTheme = require('tailwindcss/defaultTheme')
module.exports = {
  content: [
    "pages/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
    },
    container: {
      padding: '10rem',
    },
    plugins: [
      require('@tailwindcss/forms'),
    ],
  },
  plugins: [],
}
