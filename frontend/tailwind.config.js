/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // ProctorAI Dark Futuristic Palette
        background: "#0A0C14",
        surface: "#0F1220",
        "surface-2": "#141829",
        "surface-3": "#1A2035",
        border: "#1E2743",
        "border-bright": "#2A3A6E",
        
        // Primary - Electric Blue
        primary: {
          DEFAULT: "#4F6EF7",
          50: "#EEF1FE",
          100: "#D4DBFD",
          200: "#A9B8FB",
          300: "#7E94F9",
          400: "#5370F8",
          500: "#4F6EF7",
          600: "#2851F5",
          700: "#1238D3",
          800: "#0D29A1",
          900: "#081A6F",
          foreground: "#FFFFFF",
        },
        
        // Accent - Cyan
        accent: {
          DEFAULT: "#00D4FF",
          dark: "#0099CC",
          foreground: "#0A0C14",
        },
        
        // Risk levels
        "risk-low": "#10B981",
        "risk-medium": "#F59E0B",
        "risk-high": "#EF4444",
        "risk-critical": "#DC2626",
        
        // Status colors
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
        
        // Text
        foreground: "#E2E8F0",
        "foreground-muted": "#64748B",
        "foreground-subtle": "#334155",
        
        // Glass effects
        glass: "rgba(255, 255, 255, 0.03)",
        "glass-border": "rgba(255, 255, 255, 0.08)",
      },
      
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, #4F6EF7 0%, #00D4FF 100%)",
        "gradient-danger": "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
        "gradient-success": "linear-gradient(135deg, #10B981 0%, #059669 100%)",
        "gradient-dark": "linear-gradient(180deg, #0F1220 0%, #0A0C14 100%)",
        "mesh-gradient": "radial-gradient(at 40% 20%, hsla(228, 90%, 57%, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189, 100%, 50%, 0.1) 0px, transparent 50%)",
      },
      
      fontFamily: {
        sans: ["Inter var", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Inter var", "Inter", "system-ui", "sans-serif"],
      },
      
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      
      boxShadow: {
        "glow-primary": "0 0 20px rgba(79, 110, 247, 0.3)",
        "glow-danger": "0 0 20px rgba(239, 68, 68, 0.3)",
        "glow-success": "0 0 20px rgba(16, 185, 129, 0.3)",
        "glow-accent": "0 0 20px rgba(0, 212, 255, 0.3)",
        "card": "0 4px 24px rgba(0, 0, 0, 0.4)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.6)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite alternate",
        "scan-line": "scan-line 3s linear infinite",
        "float": "float 3s ease-in-out infinite",
        "gradient-shift": "gradient-shift 4s ease infinite",
      },
      
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "glow-pulse": {
          from: { boxShadow: "0 0 10px rgba(79, 110, 247, 0.3)" },
          to: { boxShadow: "0 0 30px rgba(79, 110, 247, 0.6)" },
        },
        "scan-line": {
          "0%": { top: "0%" },
          "100%": { top: "100%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
