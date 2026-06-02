import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f7f8f4",
        ink: "#20231f",
        muted: "#6d746a",
        line: "#dfe4d7",
        moss: "#476b53",
        "moss-soft": "#e7efe5",
        coral: "#c85645",
        "coral-soft": "#f7ded9",
        honey: "#d49a2d",
        "honey-soft": "#f6ead1",
        mint: "#2f8f7a",
        "mint-soft": "#dff1ec"
      },
      boxShadow: {
        panel: "0 14px 40px rgba(32, 35, 31, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
