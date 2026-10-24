/**
 * @file src/lib/ai/providers/gemini-provider.ts
 *
 * Google Gemini LLM Provider.
 * Activates when GOOGLE_GENERATIVE_AI_API_KEY is configured.
 */

import { z } from "zod";
import { LLMProvider, GenerationOptions } from "../types";

export class GeminiLLMProvider implements LLMProvider {
  readonly name = "google-gemini";
  private apiKey: string;

  constructor(apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "") {
    this.apiKey = apiKey;
  }

  async generateStructured<T>(
    schema: z.ZodType<T, any, any>,
    prompt: string,
    options?: GenerationOptions,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
    }

    const model = options?.model || process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const systemInstruction = options?.systemPrompt
      ? { parts: [{ text: `${options.systemPrompt}\nReturn strictly valid JSON only.` }] }
      : { parts: [{ text: "You are an intelligent travel planning agent. Return strictly valid JSON conforming to the requested schema." }] };

    const body = {
      systemInstruction,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: options?.temperature ?? 0.2,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Gemini API error (${res.status}): ${errorText}`);
    }

    const json = await res.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("Gemini returned empty candidate content.");
    }

    const parsedRaw = JSON.parse(candidateText);
    const parsed = schema.safeParse(parsedRaw);
    if (!parsed.success) {
      console.error("[GeminiLLMProvider Schema Mismatch] Candidate text was:\n", candidateText);
      console.error("[GeminiLLMProvider Schema Mismatch] Schema validation issues:\n", JSON.stringify(parsed.error.issues, null, 2));
      throw new Error(`Gemini schema validation failed: ${JSON.stringify(parsed.error.issues)}`);
    }
    return parsed.data;
  }
}
