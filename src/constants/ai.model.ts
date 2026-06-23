/** Model mặc định — Gemini Interactions API (SDK @google/genai v2) */
export const DEFAULT_AI_MODEL = 'gemini-2.5-flash-lite';

/** Thử lần lượt khi model chính lỗi hoặc hết quota */
export const DEFAULT_FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];
