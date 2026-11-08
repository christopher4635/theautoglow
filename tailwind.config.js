/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F7F7F7",
        "surface-subtle": "#FAFAFA",
        charcoal: "#222222",
        "charcoal-dark": "#121212",
        "charcoal-light": "#333333",
        muted: "#777777",
        "muted-dark": "#555555",
        "muted-light": "#999999",
        border: "#EAEAEA",
        "border-strong": "#D5D5D5",
        primary: {
          DEFAULT: "#18181B",
          hover: "#27272A",
          foreground: "#FFFFFF",
        },
        navy: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          foreground: "#FFFFFF",
        },
        status: {
          success: "#15803D",
          "success-bg": "#F0FDF4",
          "success-border": "#BBF7D0",
          warning: "#B45309",
          "warning-bg": "#FFFBEB",
          "warning-border": "#FDE68A",
          error: "#B91C1C",
          "error-bg": "#FEF2F2",
          "error-border": "#FECACA",
          info: "#1D4ED8",
          "info-bg": "#EFF6FF",
          "info-border": "#BFDBFE",
          neutral: "#4B5563",
          "neutral-bg": "#F3F4F6",
          "neutral-border": "#E5E7EB",
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
      }
    },
  },
  plugins: [],
}
