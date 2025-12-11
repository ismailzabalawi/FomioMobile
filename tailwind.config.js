/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./shared/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class", // Required for manual color scheme control via NativeWind
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Fomio Color Tokens (Light + Dark/AMOLED)
        // Base surfaces
        "fomio-bg": "#F7F7F8",
        "fomio-bg-dark": "#000000", // AMOLED - true black baseline
        "fomio-card": "#FFFFFF",
        "fomio-card-dark": "#050505", // Subtle grey above black, never replaces black baseline
        "fomio-border-soft": "#E3E3E6",
        "fomio-border-soft-dark": "#1C1C1E",
        // Text
        "fomio-foreground": "#111111",
        "fomio-foreground-dark": "#F5F5F7",
        "fomio-muted": "#6B6B72",
        "fomio-muted-dark": "#A1A1AA",
      // Accents
      "fomio-primary": "#009688", // Fomio Teal - primary brand hue
      "fomio-primary-dark": "#26A69A", // Teal 400 for better pop on dark surfaces
      "fomio-primary-soft": "#B2DFDB",
      "fomio-primary-soft-dark": "#0B2F2C",
      // Secondary accent (brand blue)
      "fomio-accent": "#1565C0",
      "fomio-accent-dark": "#42A5F5",
      "fomio-danger": "#EF4444",
      "fomio-danger-dark": "#F97373",
      "fomio-warning": "#F59E0B",
      "fomio-warning-dark": "#FBBF24",
      },
      fontSize: {
        // Typography Scale (mapped to NativeWind classes)
        display: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
        title: ["24px", { lineHeight: "32px", letterSpacing: "-0.015em" }],
        subtitle: ["18px", { lineHeight: "24px" }],
        body: ["15px", { lineHeight: "22px" }],
        caption: ["13px", { lineHeight: "18px" }],
        label: ["11px", { lineHeight: "14px", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        "fomio-card": "18px",
        "fomio-pill": "9999px",
      },
      spacing: {
        // Fomio-specific spacing tokens
        "fomio-xs": "4px",
        "fomio-sm": "8px",
        "fomio-md": "12px",
        "fomio-lg": "16px",
        "fomio-xl": "24px",
      },
    },
  },
  plugins: [],
}
