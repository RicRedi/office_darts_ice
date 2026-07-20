import { useMemo } from 'react';
import { generateIdenticon } from '../../utils/identicon.js';

const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
};

/**
 * Renders a player's avatar. Falls back to a deterministic identicon
 * generated from the player id. If `player.avatar_url` ever exists
 * (future extension, not used in v1) it takes priority over the identicon.
 */
export default function Avatar({ player, size = 'md' }) {
  const svg = useMemo(() => generateIdenticon(player?.id ?? 'unknown'), [player?.id]);
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  if (player?.avatar_url) {
    return (
      <img
        src={player.avatar_url}
        alt={player.name ?? ''}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden shrink-0`}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-label={player?.name ? `Avatar hráče ${player.name}` : 'Avatar'}
      role="img"
    />
  );
}
