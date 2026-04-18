// Provider-agnostic AI wrapper. All routes call through here, so switching
// back to Anthropic (or adding OpenAI) is a one-file change.
//
// Env: GEMINI_API_KEY (aliased to GOOGLE_GENERATIVE_AI_API_KEY for AI SDK).
import { google } from "@ai-sdk/google";
import { generateObject, generateText, jsonSchema } from "ai";

// JSONSchema7 from the `ai` package narrows `type` to a literal union, which
// rejects plain object literals written as `{ type: "object", ... }` (TS widens
// them to `string`). Accept a broader record here and cast at the call site —
// the schema still reaches Gemini unchanged.
type JSONSchema = Record<string, unknown>;

// Alias GEMINI_API_KEY → GOOGLE_GENERATIVE_AI_API_KEY (what AI SDK reads)
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
}

// Gemini 2.5 Pro is billing-tier only. Flash-Lite has higher free-tier limits
// (15 RPM / 1000 RPD vs Flash's 10 RPM / 250 RPD) and produces adequate output
// for our structured-JSON and short-text use cases.
const STRUCTURED_MODEL = "gemini-2.5-flash-lite";
const TEXT_MODEL = "gemini-2.5-flash-lite";

// Gemini 2.5's "thinking" tokens count against maxOutputTokens and can truncate
// the actual response. Disable for our calls — we only care about the final JSON.
const NO_THINKING = {
  google: { thinkingConfig: { thinkingBudget: 0, includeThoughts: false } },
} as const;

export async function generateStructured<T = Record<string, unknown>>(opts: {
  prompt: string;
  schema: JSONSchema;
  model?: string;
  maxTokens?: number;
}): Promise<T> {
  const { object } = await generateObject({
    model: google(opts.model ?? STRUCTURED_MODEL),
    schema: jsonSchema<T>(opts.schema as Parameters<typeof jsonSchema>[0]),
    prompt: opts.prompt,
    maxOutputTokens: opts.maxTokens,
    providerOptions: NO_THINKING,
    // Disable SDK-level retries — on rate limits the SDK retries 3× within ~1s
    // which stacks against Gemini's RPM cap. We bubble up, let the warm script
    // (or caller) retry with proper backoff.
    maxRetries: 0,
  });
  return object;
}

export async function generateSimpleText(opts: {
  prompt: string;
  model?: string;
  maxTokens?: number;
}): Promise<string> {
  const { text } = await generateText({
    model: google(opts.model ?? TEXT_MODEL),
    prompt: opts.prompt,
    maxOutputTokens: opts.maxTokens,
    providerOptions: NO_THINKING,
    maxRetries: 0,
  });
  return text.trim();
}
