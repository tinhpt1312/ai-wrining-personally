import { extractAiAnalytics } from '../../writing-suggestions/utils/analysis-suggestions.util';

const CRITERIA_KEYS = ['structure', 'clarity', 'tone', 'coherence'] as const;

const CRITERIA_LABELS: Record<(typeof CRITERIA_KEYS)[number], string> = {
  structure: 'Bố cục & Tổ chức',
  clarity: 'Rõ ràng & Diễn đạt',
  tone: 'Giọng điệu & Phong cách',
  coherence: 'Sự liên kết',
};

export function getOverallScore(
  feedbackJson?: object | null,
): number | null {
  const feedback = extractAiAnalytics(feedbackJson);
  if (!feedback) return null;

  const scores = CRITERIA_KEYS.map((key) => feedback[key]?.score).filter(
    (score): score is number => typeof score === 'number',
  );

  if (scores.length === 0) return null;
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

export function computeCriterionAverages(
  analyses: Array<{ feedbackJson?: object | null }>,
) {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const key of CRITERIA_KEYS) {
    sums[key] = 0;
    counts[key] = 0;
  }

  for (const analysis of analyses) {
    const feedback = extractAiAnalytics(analysis.feedbackJson);
    if (!feedback) continue;

    for (const key of CRITERIA_KEYS) {
      const score = feedback[key]?.score;
      if (typeof score === 'number') {
        sums[key] += score;
        counts[key] += 1;
      }
    }
  }

  const averages: Record<string, number | null> = {};
  for (const key of CRITERIA_KEYS) {
    averages[key] =
      counts[key] > 0
        ? Math.round((sums[key] / counts[key]) * 10) / 10
        : null;
  }

  return averages;
}

export function findWeakestCriterion(
  averages: Record<string, number | null>,
): { key: string; label: string; score: number } | null {
  let weakest: { key: string; label: string; score: number } | null = null;

  for (const key of CRITERIA_KEYS) {
    const score = averages[key];
    if (score == null) continue;
    if (!weakest || score < weakest.score) {
      weakest = {
        key,
        label: CRITERIA_LABELS[key],
        score,
      };
    }
  }

  return weakest;
}

export function computeWritingStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const daySet = new Set(
    dates.map((date) => date.toISOString().slice(0, 10)),
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Cho phép chưa viết hôm nay — bắt đầu từ hôm qua nếu hôm nay trống
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!daySet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export { CRITERIA_KEYS, CRITERIA_LABELS };
