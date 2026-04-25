import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}", "./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        pill: "999px",
      },
      colors: {
        primary: {
          DEFAULT: "#C8F5EC",
          hover: "#AEECE1",
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.45)",
          hover: "rgba(255, 255, 255, 0.62)",
          border: "rgba(255, 255, 255, 0.55)",
          deep: "rgba(255, 255, 255, 0.22)",
        },
        accent: {
          mint: "#C8F5EC",
          lavender: "#D4CCFF",
          peach: "#FFD6CC",
          dark: "#1A1A2E",
        },
        text: {
          primary: "#1A1A2E",
          secondary: "#6B7280",
          muted: "#9CA3AF",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.50)",
        }
      },
      boxShadow: {
        glass: "0 2px 16px rgba(180,180,200,0.18), 0 8px 32px rgba(180,180,200,0.10), inset 0 1.5px 0 rgba(255,255,255,0.90)",
        "glass-2": "0 4px 24px rgba(180,180,200,0.22), 0 12px 48px rgba(180,180,200,0.12), inset 0 2px 0 rgba(255,255,255,0.95)",
        convex: "0 2px 12px rgba(180,180,200,0.15), inset 0 2px 4px rgba(255,255,255,0.95), inset 0 -1px 2px rgba(180,180,200,0.08)",
        inset: "inset 0 2px 6px rgba(180,180,200,0.15)",
        pressed: "inset 0 2px 8px rgba(180,180,200,0.25), inset 0 1px 0 rgba(255,255,255,0.50)",
        premium: "0 2px 16px rgba(180,180,200,0.18), 0 8px 32px rgba(180,180,200,0.10)",
      },
      backdropBlur: {
        glass: "20px",
        'glass-sm': "10px",
      }
    },
  },
  plugins: [],
} satisfies Config;
