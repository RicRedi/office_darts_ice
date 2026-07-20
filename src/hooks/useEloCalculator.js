const GUEST_COEFFICIENT = 0.3;

export function getKFactor(gamesPlayed) {
  return gamesPlayed < 10 ? 40 : 32;
}

function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

function actualScore(rankA, rankB) {
  if (rankA < rankB) return 1;
  if (rankA > rankB) return 0;
  return 0.5;
}

/**
 * Pairwise multiplayer Elo: each player is compared against every other
 * player in the match, changes are averaged over the N-1 opponents.
 */
export function calculateMultiplayerElo(players) {
  const n = players.length;
  if (n <= 1) {
    return players.map((p) => ({ id: p.id, eloChange: 0 }));
  }

  return players.map((player) => {
    const k = getKFactor(player.gamesPlayed);
    let totalDelta = 0;
    for (const opponent of players) {
      if (opponent.id === player.id) continue;
      const expected = expectedScore(player.elo, opponent.elo);
      const actual = actualScore(player.rank, opponent.rank);
      totalDelta += k * (actual - expected);
    }
    let eloChange = totalDelta / (n - 1);
    if (player.isGuest) {
      eloChange *= GUEST_COEFFICIENT;
    }
    return { id: player.id, eloChange: Math.round(eloChange) };
  });
}

/**
 * Full recalculation of Elo/games_played/current_win_streak from scratch,
 * chronologically replaying every non-invalidated multiplayer match.
 * Idempotent: running it repeatedly on the same data yields the same result.
 * Training matches never affect Elo and are left untouched.
 */
export function recalculateAllElo(players, matches) {
  const state = {};
  for (const [id, player] of Object.entries(players)) {
    state[id] = {
      elo: 1000,
      gamesPlayed: 0,
      currentWinStreak: 0,
      isGuest: !!player.is_guest,
    };
  }

  const matchEntries = Object.entries(matches)
    .filter(([, m]) => m.mode === 'multiplayer' && !m.is_invalidated)
    .sort((a, b) => a[1].timestamp - b[1].timestamp);

  const updatedMatches = { ...matches };

  for (const [matchId, match] of matchEntries) {
    const playersInput = match.results.map((r) => {
      const s = state[r.player_id];
      return {
        id: r.player_id,
        elo: s.elo,
        gamesPlayed: s.gamesPlayed,
        isGuest: s.isGuest,
        rank: r.rank,
      };
    });

    const changes = calculateMultiplayerElo(playersInput);
    const changeById = Object.fromEntries(changes.map((c) => [c.id, c.eloChange]));

    updatedMatches[matchId] = {
      ...match,
      results: match.results.map((r) => ({
        ...r,
        elo_before: state[r.player_id].elo,
        elo_change: changeById[r.player_id],
      })),
    };

    for (const r of match.results) {
      const s = state[r.player_id];
      s.elo += changeById[r.player_id];
      s.gamesPlayed += 1;
      s.currentWinStreak = r.rank === 1 ? s.currentWinStreak + 1 : 0;
    }
  }

  const updatedPlayers = {};
  for (const [id, player] of Object.entries(players)) {
    const s = state[id];
    updatedPlayers[id] = {
      ...player,
      elo: s.elo,
      games_played: s.gamesPlayed,
      current_win_streak: s.currentWinStreak,
    };
  }

  return { updatedPlayers, updatedMatches };
}
