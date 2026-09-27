import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // app.js is the Passenger/Node custom server entry point. It runs
  // directly under plain Node (no transpile step), so it is intentionally
  // CommonJS (`require`), unlike everything under src/. This narrowly
  // scoped override only affects this one file — the rule stays enabled
  // everywhere else.
  {
    files: ["app.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
