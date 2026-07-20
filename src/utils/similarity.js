export function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

const SIMILARITY_THRESHOLD = 2;

/**
 * Finds an existing player whose (normalized) name exactly matches, or is
 * within a small Levenshtein distance of, the given name. Used to warn
 * against creating accidental duplicate players (typos, re-adding an
 * archived player, etc).
 */
export function findSimilarPlayer(name, players) {
  const normalized = normalizeName(name);
  let fuzzyMatch = null;

  for (const player of players) {
    const playerNormalized = normalizeName(player.name);
    if (playerNormalized === normalized) {
      return player;
    }
    if (!fuzzyMatch && levenshteinDistance(normalized, playerNormalized) <= SIMILARITY_THRESHOLD) {
      fuzzyMatch = player;
    }
  }

  return fuzzyMatch;
}
