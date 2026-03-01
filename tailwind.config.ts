import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f8",
          100: "#ffe4f3",
          500: "#ff4da6",
          600: "#f63396",
          900: "#8f1f63"
        },
        slate: {
          50: "#f3fdff",
          100: "#d7f7ff",
          200: "#b8ebff",
          300: "#8fdaff",
          500: "#1fb6d9",
          600: "#1097c3",
          700: "#0c6d9c",
          900: "#0a2f4d"
        }
      }
    }
  },
  plugins: []
};

export default config;
