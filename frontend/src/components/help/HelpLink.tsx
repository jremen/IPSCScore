import { useHelpNavigation } from '../../hooks/useHelpNavigation';
import { getHelpSectionByMarkdown } from '../../config/helpSections';
import { type TabId } from '../../stores/uiStore';
import type { HelpLinkProps } from './types';

/**
 * Custom link renderer for markdown content in the help modal.
 *
 * Supported URL schemes:
 *   app-action:<name>  – switch to the right tab and trigger a menu action
 *                        (e.g. "app-action:new-match" opens the New Match modal)
 *   app-tab:<tabId>    – switch to a tab without triggering an action
 *   page.md            – open another help section
 *   http(s)://…        – external link, opens in a new tab
 *   #…                 – in-page anchor (default behavior)
 */
export default function HelpLink({ href, children, onNavigateSection, ...rest }: HelpLinkProps) {
  const { navigate, navigateToTab } = useHelpNavigation();

  if (!href) {
    return (
      <a {...rest} href={href}>
        {children}
      </a>
    );
  }

  // app-action: scheme — switch tab + trigger action
  if (href.startsWith('app-action:')) {
    const action = href.slice('app-action:'.length);
    return (
      <a
        {...rest}
        href={href}
        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          navigate(action);
        }}
      >
        {children}
      </a>
    );
  }

  // app-tab: scheme — switch tab only
  if (href.startsWith('app-tab:')) {
    const tab = href.slice('app-tab:'.length) as TabId;
    return (
      <a
        {...rest}
        href={href}
        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          navigateToTab(tab);
        }}
      >
        {children}
      </a>
    );
  }

  // Relative markdown link — open another help section in place.
  const relativeFile = href.replace(/^\.\//, '').split('#')[0];
  if (
    onNavigateSection &&
    !relativeFile.startsWith('/') &&
    !relativeFile.includes('/') &&
    relativeFile.endsWith('.md')
  ) {
    const section = getHelpSectionByMarkdown(relativeFile);
    if (section) {
      return (
        <a
          {...rest}
          href={href}
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection(section.id);
          }}
        >
          {children}
        </a>
      );
    }
  }

  // External link
  if (/^https?:\/\//i.test(href)) {
    return (
      <a {...rest} href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  // Default (in-page anchor, etc.)
  return (
    <a {...rest} href={href}>
      {children}
    </a>
  );
}
