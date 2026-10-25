/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@sehatkosh/tailwind-config")],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/types/src/**/*.{ts,tsx}",
  ],
};
