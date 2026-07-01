import { execFile } from 'child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function extractXmlAttribute(tag: string, attribute: string): string | null {
  const regex = new RegExp(`${attribute}=["']([^"']+)["']`, 'i');
  const match = tag.match(regex);
  return match?.[1] ?? null;
}

function parseOpfSpineHrefs(opfXml: string): string[] {
  const manifestItems = new Map<string, string>();
  const itemRegex = /<item\b[^>]*\/?>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
    const tag = itemMatch[0];
    const id = extractXmlAttribute(tag, 'id');
    const href = extractXmlAttribute(tag, 'href');
    const mediaType = extractXmlAttribute(tag, 'media-type') ?? '';

    if (id && href && /html|xhtml/i.test(mediaType)) {
      manifestItems.set(id, href);
    }
  }

  const spineHrefs: string[] = [];
  const itemrefRegex = /<itemref\b[^>]*\/?>/gi;
  let spineMatch: RegExpExecArray | null;

  while ((spineMatch = itemrefRegex.exec(opfXml)) !== null) {
    const idref = extractXmlAttribute(spineMatch[0], 'idref');
    if (idref && manifestItems.has(idref)) {
      spineHrefs.push(manifestItems.get(idref)!);
    }
  }

  if (spineHrefs.length === 0) {
    for (const href of manifestItems.values()) {
      spineHrefs.push(href);
    }
  }

  return spineHrefs;
}

function extractBodyHtml(content: string): string {
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch?.[1]?.trim() ?? content.trim();
}

export async function parseEpubToHtml(buffer: Buffer): Promise<string> {
  const workDir = await mkdtemp(join(tmpdir(), 'epub-'));
  const epubPath = join(workDir, 'book.epub');
  const extractDir = join(workDir, 'extracted');

  try {
    await writeFile(epubPath, buffer);
    await mkdir(extractDir, { recursive: true });
    await execFileAsync('unzip', ['-q', '-o', epubPath, '-d', extractDir]);

    const containerXml = await readFile(
      join(extractDir, 'META-INF', 'container.xml'),
      'utf-8',
    );
    const rootfileMatch = containerXml.match(/<rootfile\b[^>]*\/?>/i);
    const opfRelativePath = rootfileMatch
      ? extractXmlAttribute(rootfileMatch[0], 'full-path')
      : null;

    if (!opfRelativePath) {
      throw new Error('EPUB container.xml missing rootfile');
    }

    const opfPath = join(extractDir, opfRelativePath);
    const opfXml = await readFile(opfPath, 'utf-8');
    const opfDir = dirname(opfPath);
    const spineHrefs = parseOpfSpineHrefs(opfXml);

    if (spineHrefs.length === 0) {
      throw new Error('EPUB has no readable HTML content');
    }

    const htmlParts: string[] = [];
    for (const href of spineHrefs) {
      const chapterPath = join(opfDir, decodeURIComponent(href));
      const content = await readFile(chapterPath, 'utf-8');
      const bodyHtml = extractBodyHtml(content);
      if (bodyHtml) {
        htmlParts.push(bodyHtml);
      }
    }

    const html = htmlParts.join('\n').trim();
    if (!html || html.length < 20) {
      throw new Error('EPUB content is empty');
    }

    return html;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
