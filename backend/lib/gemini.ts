import { GoogleGenAI } from "@google/genai";

export const MODELS = {
  FLASH_LITE: "gemini-2.5-flash-lite",
  FLASH: "gemini-2.5-flash",
} as const;

const globalForGemini = globalThis as unknown as { gemini?: GoogleGenAI };

export const gemini =
  globalForGemini.gemini ?? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "dummy" });

globalForGemini.gemini = gemini;
