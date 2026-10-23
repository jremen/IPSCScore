import { useMemo } from 'react';
import type { Components } from 'react-markdown';
import { useTranslation } from 'react-i18next';
import ZoomableImage from '../components/help/ZoomableImage';
import HelpLink from '../components/help/HelpLink';
import { resolveHelpAsset } from '../utils/help';
import type { ImageMeta } from '../components/help/types';

export function useHelpMarkdownComponents(
  language: string,
  imageList: ImageMeta[],
  onNavigateSection?: (id: string) => void,
) {
  const { t } = useTranslation();

  const components: Components = useMemo(
    () => ({
      a: ({ node: _node, ...props }) => (
        <HelpLink {...props} onNavigateSection={onNavigateSection} />
      ),
      img: ({ src, alt, ...rest }) => {
        const source = typeof src === 'string' ? src : '';
        const resolved = resolveHelpAsset(language, source);
        const index = imageList.findIndex((image) => image.src === resolved);
        return (
          <ZoomableImage
            src={resolved}
            alt={alt ?? ''}
            images={imageList}
            index={index >= 0 ? index : 0}
            {...rest}
          />
        );
      },
    }),
    [imageList, language, onNavigateSection],
  );

  return { t, components };
}
