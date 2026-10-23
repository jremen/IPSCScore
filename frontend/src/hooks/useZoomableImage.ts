import { useMemo, useState } from 'react';
import type { ZoomableImageProps } from '../components/help/types';

export function useZoomableImage({ src, alt = '', images, index = 0 }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  const slides = useMemo(
    () => (images && images.length > 0 ? images : [{ src: src ?? '', alt }]),
    [alt, images, src],
  );
  const openAt = images ? index : 0;

  const openLightbox = () => setOpen(true);
  const closeLightbox = () => setOpen(false);

  return { open, slides, openAt, openLightbox, closeLightbox };
}
