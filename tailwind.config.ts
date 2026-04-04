import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hsa: {
          green: "#006b3c",
          "green-light": "#00a65a",
          "green-dark": "#004d2a",
          "green-pale": "#e6f7f0",
          blue: "#0052a5",
          "blue-light": "#1a6fc9",
          "blue-pale": "#e8f0fb",
          red: "#c0392b",
          "red-pale": "#fdf2f2",
          gray: "#4a5568",
          "gray-light": "#f7f9fc",
          border: "#d1d9e6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,107,60,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
