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
        background: '#09090b', // zinc-950
        foreground: '#fafafa', // zinc-50
        primary: {
          DEFAULT: '#6366f1', // indigo-500
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: '#18181b', // zinc-900
          foreground: '#fafafa',
        },
        border: '#27272a', // zinc-800
        muted: {
          DEFAULT: '#27272a',
          foreground: '#a1a1aa', // zinc-400
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#fafafa',
        },
        accent: {
          DEFAULT: '#6366f1',
          foreground: '#fafafa',
        },
        ring: '#6366f1',
      },
    },
  },
  plugins: [],
};
export default config;
