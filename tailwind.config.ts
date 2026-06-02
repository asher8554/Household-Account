import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        field: "rgb(var(--color-field) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        moss: "rgb(var(--color-moss) / <alpha-value>)",
        "moss-hover": "rgb(var(--color-moss-hover) / <alpha-value>)",
        "moss-soft": "rgb(var(--color-moss-soft) / <alpha-value>)",
        coral: "rgb(var(--color-coral) / <alpha-value>)",
        "coral-hover": "rgb(var(--color-coral-hover) / <alpha-value>)",
        "coral-soft": "rgb(var(--color-coral-soft) / <alpha-value>)",
        honey: "rgb(var(--color-honey) / <alpha-value>)",
        "honey-soft": "rgb(var(--color-honey-soft) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        "mint-soft": "rgb(var(--color-mint-soft) / <alpha-value>)",
        "expense-0": "rgb(var(--color-expense-0) / <alpha-value>)",
        "expense-1": "rgb(var(--color-expense-1) / <alpha-value>)",
        "expense-2": "rgb(var(--color-expense-2) / <alpha-value>)",
        "expense-3": "rgb(var(--color-expense-3) / <alpha-value>)",
        "expense-4": "rgb(var(--color-expense-4) / <alpha-value>)"
      },
      boxShadow: {
        panel: "var(--shadow-panel)"
      }
    }
  },
  plugins: []
} satisfies Config;
