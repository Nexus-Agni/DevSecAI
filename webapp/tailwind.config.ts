import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        foreground: '#e5e5e5',
        primary: {
          DEFAULT: '#ff6b00',
          foreground: '#000000',
        },
        card: {
          DEFAULT: '#0a0a0a',
          foreground: '#e5e5e5',
        },
        border: '#1a1a1a',
        muted: {
          DEFAULT: '#171717',
          foreground: '#737373',
        },
        destructive: '#ef4444',
        accent: '#1a1a1a',
      },
    },
  },
  plugins: [],
};
export default config;
