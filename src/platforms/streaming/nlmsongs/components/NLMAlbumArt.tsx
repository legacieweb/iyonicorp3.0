import { Music2 } from 'lucide-react';
import { resolveAssetUrl } from '../utils';
import type { Track } from '../types';

interface Props {
  track?: Track | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;
  className?: string;
  ariaHidden?: boolean;
}

const SIZE_MAP = {
  xs: 22,
  sm: 34,
  md: 46,
  lg: 80,
  xl: 190,
};

export const NLMAlbumArt = ({ track, size = 'md', rounded = true, className, ariaHidden }: Props) => {
  const dimension = SIZE_MAP[size];
  const iconSize = dimension < 40 ? 16 : dimension < 100 ? 36 : 48;
  const coverUrl = track?.coverUrl;

  return (
    <span
      className={`nlm-album-art nlm-album-art--${size} ${rounded ? 'is-rounded' : ''} ${className || ''}`}
      aria-hidden={ariaHidden}
    >
      {coverUrl ? (
        <img src={resolveAssetUrl(coverUrl)} alt={track?.title || 'Album art'} />
      ) : (
        <span className="nlm-album-art-fallback">
          <Music2 size={iconSize} />
        </span>
      )}
    </span>
  );
};

export default NLMAlbumArt;
