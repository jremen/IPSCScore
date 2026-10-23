import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useHelpContent } from '../../hooks/useHelpContent';
import { useHelpMarkdownComponents } from '../../hooks/useHelpMarkdownComponents';
import type { HelpContentProps } from './types';

export default function HelpContent({ section, onNavigateSection }: HelpContentProps) {
  const { language, content, error, imageList, retry } = useHelpContent({ section });
  const { t, components } = useHelpMarkdownComponents(language, imageList, onNavigateSection);

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-3">{t('help.loadError')}</p>
        <button
          type="button"
          onClick={retry}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
        >
          {t('help.retry')}
        </button>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        {t('help.loadingDoc')}
      </div>
    );
  }

  return (
    <div className="prose prose-gray dark:prose-invert max-w-none p-6 eink:prose-headings:text-black! eink:prose-p:text-black! eink:prose-strong:text-black! eink:prose-li:text-black!">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
