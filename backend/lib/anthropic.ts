import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  HAIKU: "claude-haiku-4-5-20250315",
  SONNET: "claude-sonnet-4-6-20250514",
} as const;

const globalForAnthropic = globalThis as unknown as { anthropic?: Anthropic };

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

globalForAnthropic.anthropic = anthropic;
