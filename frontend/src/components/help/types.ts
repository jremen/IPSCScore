import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import type { HelpSection } from '../../config/helpSections';

export interface ImageMeta {
  src: string;
  alt: string;
}

export interface ZoomableImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  alt?: string;
  images?: ImageMeta[];
  index?: number;
}

export interface HelpSidebarProps {
  sections: HelpSection[];
  activeId: string;
  onSelect: (id: string) => void;
}

export interface HelpLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
  children?: ReactNode;
  onNavigateSection?: (id: string) => void;
}

export interface HelpContentProps {
  section: HelpSection;
  onNavigateSection?: (id: string) => void;
}

export interface HelpModalProps {
  show: boolean;
  onClose: () => void;
}
