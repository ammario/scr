const defaultTheme = require("tailwindcss/defaultTheme");
module.exports = {
  content: ["pages/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
    },
    container: {
      padding: "20rem",
    },
    plugins: [require("@tailwindcss/forms")],
  },
  plugins: [],
};
