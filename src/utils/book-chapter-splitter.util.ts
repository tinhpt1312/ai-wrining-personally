export interface ParsedBookChapter {
  title: string;
  content: string;
  contentFormat: 'html' | 'plain';
  wordCount: number;
}

const HEADING_SPLIT_REGEX = /(?=<h[12][^>]*>)/i;
const STRIP_HTML_REGEX = /<[^>]+>/g;
const WORDS_PER_CHAPTER_FALLBACK = 2500;

function stripHtml(html: string): string {
  return html.replace(STRIP_HTML_REGEX, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  const plain = text.includes('<') ? stripHtml(text) : text;
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

function extractTitleFromHtml(chunk: string, fallbackIndex: number): string {
  const headingMatch = chunk.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
  if (headingMatch?.[1]) {
    const title = stripHtml(headingMatch[1]).trim();
    if (title.length >= 2 && title.length <= 255) {
      return title;
    }
  }

  const plain = stripHtml(chunk);
  const firstLine = plain.split(/\n+/).find((line) => line.trim().length > 0);
  if (firstLine && firstLine.trim().length >= 2 && firstLine.trim().length <= 255) {
    return firstLine.trim();
  }

  return `Chương ${fallbackIndex}`;
}

function splitPlainTextByWordCount(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_CHAPTER_FALLBACK) {
    chunks.push(words.slice(i, i + WORDS_PER_CHAPTER_FALLBACK).join(' '));
  }
  return chunks;
}

export function splitHtmlIntoChapters(html: string): ParsedBookChapter[] {
  const trimmed = html.trim();
  if (!trimmed) return [];

  const parts = trimmed
    .split(HEADING_SPLIT_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = parts.length > 1 ? parts : splitPlainTextByWordCount(stripHtml(trimmed));

  if (chunks.length === 0) {
    return [
      {
        title: 'Chương 1',
        content: parts[0] ?? trimmed,
        contentFormat: parts[0]?.includes('<') ? 'html' : 'plain',
        wordCount: countWords(parts[0] ?? trimmed),
      },
    ];
  }

  return chunks.map((chunk, index) => {
    const isHtml = chunk.includes('<');
    const content = isHtml ? chunk : `<p>${chunk.replace(/\n+/g, '</p><p>')}</p>`;
    return {
      title: extractTitleFromHtml(content, index + 1),
      content,
      contentFormat: 'html' as const,
      wordCount: countWords(content),
    };
  });
}

export function estimateReadingMinutes(totalWords: number): number {
  if (totalWords <= 0) return 1;
  return Math.max(1, Math.ceil(totalWords / 200));
}
