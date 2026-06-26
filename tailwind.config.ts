import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        display: ["var(--font-display)", "serif"]
      },
      colors: {
        ink: "#20211d",
        paper: "#f7f2e8",
        line: "#d9cfbd",
        moss: "#49634a",
        brass: "#b8842d",
        brick: "#b84f3f",
        sea: "#2f6f73"
      }
    }
  },
  plugins: []
};

export default config;
