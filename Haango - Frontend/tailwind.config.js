/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      screens: { 
        'xs': '560px',
        'xxs': '490px',
        'xxxs': '430px',
        'ssm': '640px',
        'mmd': '850px',
      },
      backgroundImage:{},
    },
  },
  plugins: [],
}

