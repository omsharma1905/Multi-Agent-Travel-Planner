/**
 * @file src/lib/ai/index.ts
 */

import { LLMProvider } from "./types";
import { HeuristicLLMProvider } from "./providers/heuristic-provider";
import { GeminiLLMProvider } from "./providers/gemini-provider";

export * from "./types";
export * from "./providers/heuristic-provider";
export * from "./providers/gemini-provider";

/**
 * Returns the configured LLM provider based on environment variables.
 * In production (NODE_ENV === 'production'), GOOGLE_GENERATIVE_AI_API_KEY is mandatory.
 * Silent fallback to heuristic mock provider is strictly forbidden in production.
 */
export function getDefaultLLMProvider(): LLMProvider {
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey && geminiKey.trim().length > 0) {
    return new GeminiLLMProvider(geminiKey);
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new HeuristicLLMProvider();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AI_PROVIDER_CONFIGURATION_ERROR: GOOGLE_GENERATIVE_AI_API_KEY is required in production environment. Heuristic mock provider is strictly forbidden.",
    );
  }
  return new HeuristicLLMProvider();

}

