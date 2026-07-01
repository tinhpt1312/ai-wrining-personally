import { execFile } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function parsePdfToPlainText(buffer: Buffer): Promise<string> {
  const workDir = await mkdtemp(join(tmpdir(), 'pdf-'));
  const pdfPath = join(workDir, 'book.pdf');

  try {
    await writeFile(pdfPath, buffer);
    const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
    const text = stdout.trim();

    if (!text || text.length < 20) {
      throw new Error('PDF content is empty');
    }

    return text;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export function plainTextToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return `<p>${text.replace(/\s+/g, ' ').trim()}</p>`;
  }

  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('\n');
}
