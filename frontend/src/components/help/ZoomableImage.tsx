import { useTranslation } from 'react-i18next';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { useZoomableImage } from '../../hooks/useZoomableImage';
import type { ZoomableImageProps } from './types';

/**
 * Image renderer for markdown that opens a fullscreen lightbox on click.
 * When a parent HelpContent provides the full image list, the lightbox
 * supports arrow-key navigation between images. Otherwise the clicked
 * image is shown standalone.
 *
 * Renders as a <span> so it nests cleanly inside a markdown paragraph;
 * CSS makes it block-level visually.
 */
export default function ZoomableImage({
  src,
  alt = '',
  images,
  index = 0,
  ...rest
}: ZoomableImageProps) {
  const { t } = useTranslation();
  const { open, slides, openAt, openLightbox, closeLightbox } = useZoomableImage({
    src,
    alt,
    images,
    index,
  });

  if (!src) return null;

  return (
    <span className="block my-3 not-prose relative z-99999999">
      <button
        type="button"
        className="block cursor-zoom-in rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity text-left w-full"
        onClick={openLightbox}
        title={t('help.zoomImage')}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block w-full h-auto"
          {...rest}
        />
      </button>
      <Lightbox
        open={open}
        close={closeLightbox}
        index={openAt}
        slides={slides}
        styles={{ root: { '--yarl__portal_zindex': '999999999' } }}
      />
    </span>
  );
}
