import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wizer: {
          violet: "#7C3AED",
          lilac: "#C4B5FD",
          black: "#0A0A0A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
