/**
 * @file src/lib/ai/types.ts
 *
 * LLM Provider abstraction types and token metrics.
 */

import { z } from "zod";

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  systemPrompt?: string;
}

export interface LLMProvider {
  name: string;
  generateStructured<T>(
    schema: z.ZodType<T, any, any>,
    prompt: string,
    options?: GenerationOptions,
  ): Promise<T>;
}
