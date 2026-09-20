import type { Config } from "tailwindcss";

// Namerno prazno — dizajn sistem (boje, tipografija, razmaci) dolazi
// naknadno i ovde se unosi kao theme.extend, vidi docs/PLAN-JAVNI-SAJT.md
// (Korak 4 čeka dizajn sistem).
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
