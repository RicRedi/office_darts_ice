function isValidMultiplayer(match) {
  return match.mode === 'multiplayer' && !match.is_invalidated;
}

export function getHeadToHead(matches, playerIdA, playerIdB) {
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const match of Object.values(matches)) {
    if (!isValidMultiplayer(match)) continue;
    const resultA = match.results.find((r) => r.player_id === playerIdA);
    const resultB = match.results.find((r) => r.player_id === playerIdB);
    if (!resultA || !resultB) continue;

    if (resultA.rank < resultB.rank) wins += 1;
    else if (resultA.rank > resultB.rank) losses += 1;
    else draws += 1;
  }

  return { wins, losses, draws };
}

export function getNemesis(matches, playerId, minGames = 3) {
  const opponentIds = new Set();
  for (const match of Object.values(matches)) {
    if (!isValidMultiplayer(match)) continue;
    if (!match.results.some((r) => r.player_id === playerId)) continue;
    for (const r of match.results) {
      if (r.player_id !== playerId) opponentIds.add(r.player_id);
    }
  }

  let nemesis = null;
  let worstRatio = -Infinity;

  for (const opponentId of opponentIds) {
    const { wins, losses, draws } = getHeadToHead(matches, playerId, opponentId);
    const total = wins + losses + draws;
    if (total < minGames) continue;

    const ratio = losses / total;
    if (ratio > worstRatio) {
      worstRatio = ratio;
      nemesis = { opponentId, wins, losses };
    }
  }

  return nemesis;
}

function getWeekBounds(referenceDate) {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday.getTime(), end: sunday.getTime() };
}

export function getWeeklyRecap(matches, players, referenceDate = new Date()) {
  const { start, end } = getWeekBounds(referenceDate);
  const weekMatches = Object.values(matches).filter(
    (m) => isValidMultiplayer(m) && m.timestamp >= start && m.timestamp <= end,
  );

  if (weekMatches.length === 0) {
    return { totalMatches: 0, mostWins: null, bestForm: null };
  }

  const winCounts = {};
  const formSums = {};
  for (const match of weekMatches) {
    for (const r of match.results) {
      if (r.rank === 1) {
        winCounts[r.player_id] = (winCounts[r.player_id] || 0) + 1;
      }
      formSums[r.player_id] = (formSums[r.player_id] || 0) + (r.elo_change || 0);
    }
  }

  const [mostWinsId, mostWinsCount] =
    Object.entries(winCounts).sort((a, b) => b[1] - a[1])[0] || [];
  const [bestFormId, bestFormGain] =
    Object.entries(formSums).sort((a, b) => b[1] - a[1])[0] || [];

  return {
    totalMatches: weekMatches.length,
    mostWins: mostWinsId ? { playerId: mostWinsId, count: mostWinsCount } : null,
    bestForm: bestFormId ? { playerId: bestFormId, eloGain: bestFormGain } : null,
  };
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getForm30Days(matches, playerId, referenceDate = new Date()) {
  const cutoff = referenceDate.getTime() - THIRTY_DAYS_MS;
  let sum = 0;
  for (const match of Object.values(matches)) {
    if (!isValidMultiplayer(match) || match.timestamp < cutoff) continue;
    const result = match.results.find((r) => r.player_id === playerId);
    if (result) sum += result.elo_change || 0;
  }
  return sum;
}

export function getMatchOfTheMonth(matches, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  let best = null;
  let bestMagnitude = -1;
  for (const [id, match] of Object.entries(matches)) {
    if (!isValidMultiplayer(match)) continue;
    const d = new Date(match.timestamp);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;

    for (const r of match.results) {
      const magnitude = Math.abs(r.elo_change || 0);
      if (magnitude > bestMagnitude) {
        bestMagnitude = magnitude;
        best = { matchId: id, match };
      }
    }
  }
  return best;
}

export function getTrainingStats(matches, playerId, gameTypeId) {
  const trainings = Object.values(matches)
    .filter(
      (m) =>
        m.mode === 'training' &&
        !m.is_invalidated &&
        m.game_type_id === gameTypeId &&
        m.results[0]?.player_id === playerId,
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  if (trainings.length === 0) {
    return { best: null, average: null };
  }

  const dartsValues = trainings.map((m) => m.results[0].darts_to_close);
  const best = Math.min(...dartsValues);
  const last10 = dartsValues.slice(0, 10);
  const average = Math.round((last10.reduce((sum, v) => sum + v, 0) / last10.length) * 10) / 10;

  return { best, average };
}
