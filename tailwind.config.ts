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
        background: "#FFFDF7",
        foreground: "#1C1917",
        coral: {
          50: "#FFF1EE",
          100: "#FFE0D9",
          400: "#F0826E",
          500: "#E8614D",
          600: "#D44B38",
        },
        ink: {
          100: "#F5F3EF",
          200: "#E8E5DF",
          400: "#9C9489",
          600: "#5C5650",
          900: "#1C1917",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
