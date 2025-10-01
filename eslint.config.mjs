// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import unusedImports from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  // Next.js + TS recommended rules (via compat)
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Global ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "*.js",
      "fix-*.js", 
      "test-*.js",
      "add-*.js",
      "**/_archive/**",
    ],
  },

  // Project rules
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // Catch unused imports & vars early (ESLint + plugin)
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // Gentle console guard: allow warn/error, flag others
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Small quality-of-life rules
      "prefer-const": "warn",
      "no-duplicate-imports": "warn",
    },
  },
];

export default config;
