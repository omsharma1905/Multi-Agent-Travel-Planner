// @ts-check
import nextConfig from "eslint-config-next";

/**
 * ESLint flat config for Next.js 16 / ESLint 9.
 *
 * eslint-config-next v16 exports a native flat config array directly.
 * No FlatCompat wrapper is needed.
 */
const eslintConfig = [
  // Spread the Next.js recommended flat config (includes React, TypeScript, accessibility)
  ...nextConfig,

  // Project-specific overrides
  {
    rules: {
      // Warn on unused variables but allow underscore-prefixed ones
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Allow named exports on default export pages without warning
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default eslintConfig;
