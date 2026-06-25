export function extractJson(text: string): string {
  return extractJsonValue(text, ['{']);
}

export function extractJsonArray(text: string): string {
  return extractJsonValue(text, ['[']);
}

/**
 * Extract complete JSON objects from truncated or malformed model output.
 */
export function salvageJsonObjects(text: string): unknown[] {
  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const items: unknown[] = [];
  let searchFrom = 0;

  while (searchFrom < cleaned.length) {
    const objStart = cleaned.indexOf('{', searchFrom);
    if (objStart === -1) {
      break;
    }

    try {
      const fragment = cleaned.slice(objStart);
      const objJson = extractJsonValue(fragment, ['{']);
      items.push(JSON.parse(objJson));
      searchFrom = objStart + objJson.length;
    } catch {
      searchFrom = objStart + 1;
    }
  }

  return items;
}

/**
 * Parse writing suggestions from model output using multiple strategies.
 */
export function parseSuggestionsPayload(text: string): unknown[] {
  if (!text?.trim()) {
    throw new Error('Empty response');
  }

  const strategies: Array<() => unknown[]> = [
    () => {
      const json = extractJsonArray(text);
      const parsed: unknown = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [parsed];
    },
    () => {
      const json = extractJson(text);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      const suggestions = parsed.suggestions ?? parsed.items ?? parsed.data;

      if (!Array.isArray(suggestions)) {
        throw new Error('No suggestions array in object');
      }

      return suggestions;
    },
    () => {
      const salvaged = salvageJsonObjects(text);
      if (salvaged.length === 0) {
        throw new Error('No salvageable suggestion objects');
      }
      return salvaged;
    },
  ];

  let lastError: Error | undefined;

  for (const strategy of strategies) {
    try {
      const result = strategy().filter(
        (item) => item && typeof item === 'object',
      );
      if (result.length > 0) {
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Failed to parse suggestions');
}

export function extractJsonValue(
  text: string,
  allowedStarts: Array<'{' | '['> = ['{', '['],
): string {
  if (!text) {
    throw new Error('Empty response');
  }

  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const startIndex = findFirstJsonStart(cleaned, allowedStarts);

  if (startIndex === -1) {
    throw new Error('No JSON value found');
  }

  const openingChar = cleaned[startIndex] as '{' | '[';
  const closingChar = openingChar === '{' ? '}' : ']';
  let depth = 0;
  let endIndex = -1;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === openingChar) {
      depth++;
    }

    if (char === closingChar) {
      depth--;

      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error('Incomplete JSON value');
  }

  return cleaned.slice(startIndex, endIndex + 1);
}

function findFirstJsonStart(
  text: string,
  allowedStarts: Array<'{' | '['>,
): number {
  const indexes = allowedStarts
    .map((char) => text.indexOf(char))
    .filter((index) => index >= 0);

  return indexes.length > 0 ? Math.min(...indexes) : -1;
}
