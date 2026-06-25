import type { WritingAnalytics } from '../../ai/schemas/analysis-response.schema';

const CRITERION_TYPE_MAP: Record<string, string> = {
  structure: 'STYLE',
  clarity: 'CLARITY',
  tone: 'TONE',
  coherence: 'STYLE',
};

const PLACEHOLDER = '—';

export function extractAiAnalytics(
  feedbackJson?: object | null,
): WritingAnalytics | null {
  if (!feedbackJson || typeof feedbackJson !== 'object') return null;

  const data = feedbackJson as Record<string, unknown>;
  const nested = data.aiAnalytics;
  if (nested && typeof nested === 'object') {
    return nested as WritingAnalytics;
  }

  if ('structure' in data || 'actionItems' in data) {
    return data as WritingAnalytics;
  }

  return null;
}

export interface AnalysisSuggestionSeed {
  type: string;
  originalText: string;
  suggestedText: string;
  explanation: string;
  confidenceScore: number;
  severity: string;
}

export function buildSuggestionsFromAnalysis(
  aiAnalytics: WritingAnalytics,
): AnalysisSuggestionSeed[] {
  const seeds: AnalysisSuggestionSeed[] = [];
  const seen = new Set<string>();

  const push = (seed: AnalysisSuggestionSeed) => {
    const key = seed.explanation.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    seeds.push(seed);
  };

  for (const item of aiAnalytics.actionItems ?? []) {
    push({
      type: 'CLARITY',
      originalText: PLACEHOLDER,
      suggestedText: PLACEHOLDER,
      explanation: item,
      confidenceScore: 0.95,
      severity: 'suggestion',
    });
  }

  for (const area of aiAnalytics.areasForImprovement ?? []) {
    push({
      type: 'STYLE',
      originalText: PLACEHOLDER,
      suggestedText: PLACEHOLDER,
      explanation: area,
      confidenceScore: 0.9,
      severity: 'warning',
    });
  }

  for (const [key, type] of Object.entries(CRITERION_TYPE_MAP)) {
    const criterion = aiAnalytics[key as keyof WritingAnalytics];
    if (
      !criterion ||
      typeof criterion !== 'object' ||
      !('suggestions' in criterion)
    ) {
      continue;
    }

    for (const suggestion of criterion.suggestions ?? []) {
      push({
        type,
        originalText: PLACEHOLDER,
        suggestedText: PLACEHOLDER,
        explanation: suggestion,
        confidenceScore: 0.85,
        severity: 'suggestion',
      });
    }
  }

  return seeds.slice(0, 12);
}
