export const BADGE_THRESHOLDS = [
  { threshold: 50, label: 'Bronz', icon: '🥉' },
  { threshold: 100, label: 'Stříbro', icon: '🥈' },
  { threshold: 200, label: 'Zlato', icon: '🥇' },
];

export function getHighestBadge(gamesPlayed) {
  let highest = null;
  for (const badge of BADGE_THRESHOLDS) {
    if (gamesPlayed >= badge.threshold) {
      highest = badge;
    }
  }
  return highest;
}
