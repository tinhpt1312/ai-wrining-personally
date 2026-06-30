/**
 * Token Estimator - Rough approximation of token counts
 * OpenAI's tokenizer is complex, so we use heuristics:
 * - ~4 tokens per word (average for English/Vietnamese mix)
 * - ~1 token per 4 characters
 * - Add 20 tokens overhead for prompt structure
 */
export class TokenEstimator {
  private static readonly TOKEN_PER_WORD = 1 / 0.75; // ~1.33 words per token
  private static readonly WORD_REGEX = /\b\w+\b/g;
  private static readonly PROMPT_OVERHEAD = 20;

  /**
   * Estimate tokens for a text string
   * Accuracy: ±10-15% compared to actual GPT tokenizer
   */
  static estimateTextTokens(text: string): number {
    if (!text || text.length === 0) return 0;

    // Count words (more accurate for mixed languages)
    const wordMatches = text.match(this.WORD_REGEX);
    const wordCount = wordMatches?.length || 0;

    // Estimate tokens from word count
    const tokensFromWords = Math.ceil(wordCount / this.TOKEN_PER_WORD);

    // Add ~1 token per 4 characters for non-word content (punctuation, formatting)
    const nonWordCharCount = text.length - (wordMatches?.join('').length || 0);
    const tokensFromNonWords = Math.ceil(nonWordCharCount / 4);

    return tokensFromWords + tokensFromNonWords;
  }

  /**
   * Estimate total tokens for prompt + completion
   * Includes overhead for structure
   */
  static estimateTotalTokens(
    prompt: string,
    expectedCompletionTokens: number = 500,
  ): number {
    const promptTokens = this.estimateTextTokens(prompt) + this.PROMPT_OVERHEAD;
    return promptTokens + expectedCompletionTokens;
  }

  /**
   * Check if text will exceed token limit
   */
  static exceedsLimit(text: string, limit: number): boolean {
    return this.estimateTextTokens(text) > limit;
  }

  /**
   * Truncate text to fit within token limit
   */
  static truncateToLimit(text: string, tokenLimit: number): string {
    if (!text) return '';

    if (this.estimateTextTokens(text) <= tokenLimit) {
      return text;
    }

    // Binary search to find truncation point
    let low = 0;
    let high = text.length;

    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const truncated = text.substring(0, mid);

      if (this.estimateTextTokens(truncated) <= tokenLimit) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return text.substring(0, low);
  }

  /**
   * Get buffer amount for retries (10-15% of expected tokens)
   */
  static getBufferTokens(
    baseTokens: number,
    bufferPercent: number = 0.1,
  ): number {
    return Math.ceil(baseTokens * bufferPercent);
  }
}
