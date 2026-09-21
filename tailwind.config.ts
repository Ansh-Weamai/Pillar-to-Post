import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        paper: "var(--paper)",
        "paper-warm": "var(--paper-warm)",
        line: "var(--line)",
        "ptp-green": "var(--ptp-green)",
        "ptp-green-strong": "var(--ptp-green-strong)",
        "ptp-green-tint": "var(--ptp-green-tint)",
        "status-missing": "var(--status-missing)",
        "status-missing-tint": "var(--status-missing-tint)",
        "status-partial": "var(--status-partial)",
        "status-partial-tint": "var(--status-partial-tint)",
        "status-confirmed": "var(--status-confirmed)",
        "status-confirmed-tint": "var(--status-confirmed-tint)",
      },
    },
  },
  plugins: [],
};

export default config;
