import type { ImageMeta } from '../components/help/types';

const cache = new Map<string, string>();
export const FIRST_HELP_SECTION_ID = 'overview';

export async function loadHelpMarkdown(language: string, file: string): Promise<string> {
  const key = `${language}/${file}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const response = await fetch(`/docs/${language}/${file}`);
  if (!response.ok) throw new Error(`Failed to load ${key}: ${response.status}`);
  const text = await response.text();
  cache.set(key, text);
  return text;
}

export function resolveHelpAsset(language: string, source: string): string {
  return source.startsWith('/') ? source : `/docs/${language}/${source.replace(/^\.\//, '')}`;
}

export function extractHelpImages(content: string, language: string): ImageMeta[] {
  const lines = content.split('\n');
  const images: ImageMeta[] = [];
  let inFence = false;

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (!match) continue;
    images.push({
      alt: match[1] ?? '',
      src: resolveHelpAsset(language, match[2] ?? ''),
    });
  }

  return images;
}
