import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { extractHelpImages, loadHelpMarkdown } from '../utils/help';
import type { HelpContentProps } from '../components/help/types';

export function useHelpContent({ section }: Pick<HelpContentProps, 'section'>) {
  const language = useUIStore((s) => s.language);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    loadHelpMarkdown(language, section.markdown)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err?.message ?? err));
      });
    return () => {
      cancelled = true;
    };
  }, [language, section.markdown, reloadKey]);

  const imageList = useMemo(
    () => (content ? extractHelpImages(content, language) : []),
    [content, language],
  );

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  return { language, content, error, imageList, retry };
}
