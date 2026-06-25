export interface RawWritingSuggestion {
  type?: string;
  originalText?: string;
  suggestedText?: string;
  explanation?: string;
  confidenceScore?: number;
  severity?: string;
  position?: { start: number; end: number };
}

export function isRawWritingSuggestion(
  value: unknown,
): value is RawWritingSuggestion {
  return typeof value === 'object' && value !== null;
}
