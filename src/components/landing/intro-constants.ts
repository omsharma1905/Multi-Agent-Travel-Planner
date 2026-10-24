/**
 * @file src/components/landing/intro-constants.ts
 *
 * Exact rapid multilingual greeting sequence for SafariX opening experience.
 */

export const GREETINGS: string[] = [
  "Hello",
  "नमस्ते",
  "Hola",
  "Bonjour",
  "Ciao",
  "Olá",
  "Здравствуйте",
  "Merhaba",
  "Γειά",
  "Hej",
  "Hallo",
  "Hello",
];

// Backward-compatible alias for existing imports if needed
export const INTRO_LANGUAGES = GREETINGS.map((text) => ({ text, lang: "auto" }));
