import { ref, push, set, remove, update, get, runTransaction } from 'firebase/database';
import { calculateMultiplayerElo, recalculateAllElo } from '../hooks/useEloCalculator.js';

const EDIT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Writes a multiplayer match. Elo/games_played/current_win_streak of the
 * involved players are updated atomically via a transaction scoped on the
 * whole /players node, so two matches submitted concurrently can't read a
 * stale Elo value for the same player.
 */
export async function saveMultiplayerMatch(db, { gameTypeId, entries }) {
  const timestamp = Date.now();
  let resultsOut = null;

  await runTransaction(ref(db, 'players'), (playersData) => {
    if (!playersData) return playersData;

    const eloInput = entries.map(({ playerId, rank }) => {
      const p = playersData[playerId];
      return { id: playerId, elo: p.elo, gamesPlayed: p.games_played, isGuest: !!p.is_guest, rank };
    });
    const changes = calculateMultiplayerElo(eloInput);
    const changeById = Object.fromEntries(changes.map((c) => [c.id, c.eloChange]));

    resultsOut = entries.map(({ playerId, rank }) => ({
      player_id: playerId,
      rank,
      elo_before: playersData[playerId].elo,
      elo_change: changeById[playerId],
    }));

    for (const { playerId, rank } of entries) {
      const p = playersData[playerId];
      p.elo += changeById[playerId];
      p.games_played = (p.games_played || 0) + 1;
      p.current_win_streak = rank === 1 ? (p.current_win_streak || 0) + 1 : 0;
      p.last_played_timestamp = timestamp;
    }

    return playersData;
  });

  const matchRef = push(ref(db, 'matches'));
  await set(matchRef, {
    timestamp,
    editable_until: timestamp + EDIT_WINDOW_MS,
    game_type_id: gameTypeId,
    mode: 'multiplayer',
    is_invalidated: false,
    results: resultsOut,
  });

  return matchRef.key;
}

export async function saveTrainingMatch(db, { gameTypeId, playerId, dartsToClose }) {
  const timestamp = Date.now();
  const matchRef = push(ref(db, 'matches'));
  await set(matchRef, {
    timestamp,
    editable_until: timestamp + EDIT_WINDOW_MS,
    game_type_id: gameTypeId,
    mode: 'training',
    is_invalidated: false,
    results: [{ player_id: playerId, darts_to_close: dartsToClose }],
  });
  await update(ref(db, `players/${playerId}`), { last_played_timestamp: timestamp });
  return matchRef.key;
}

/** Self-service delete within the 10-minute edit window (section 5.1). */
export async function deleteRecentMatch(db, match) {
  if (match.mode === 'training') {
    await remove(ref(db, `matches/${match.id}`));
    return;
  }

  await runTransaction(ref(db, 'players'), (playersData) => {
    if (!playersData) return playersData;
    for (const r of match.results) {
      const p = playersData[r.player_id];
      if (!p) continue;
      p.elo -= r.elo_change;
      p.games_played = Math.max(0, (p.games_played || 0) - 1);
    }
    return playersData;
  });

  await remove(ref(db, `matches/${match.id}`));
}

async function writeRecalculatedElo(db, players, matches) {
  const { updatedPlayers, updatedMatches } = recalculateAllElo(players, matches);
  const updates = {};
  for (const [id, p] of Object.entries(updatedPlayers)) updates[`players/${id}`] = p;
  for (const [id, m] of Object.entries(updatedMatches)) updates[`matches/${id}`] = m;
  await update(ref(db), updates);
}

/** Approves an old-match deletion request: soft-invalidate + full Elo recalculation (section 4.5). */
export async function approveDeletionRequest(db, request) {
  const [playersSnap, matchesSnap] = await Promise.all([get(ref(db, 'players')), get(ref(db, 'matches'))]);
  const players = playersSnap.val() || {};
  const matches = { ...(matchesSnap.val() || {}) };
  matches[request.match_id] = { ...matches[request.match_id], is_invalidated: true };

  await writeRecalculatedElo(db, players, matches);
  await update(ref(db, `deletion_requests/${request.id}`), { status: 'approved' });
}

export async function rejectDeletionRequest(db, requestId) {
  await update(ref(db, `deletion_requests/${requestId}`), { status: 'rejected' });
}

/** Hard delete of an older match from the extended admin history + full Elo recalculation. */
export async function hardDeleteMatch(db, matchId) {
  const [playersSnap, matchesSnap] = await Promise.all([get(ref(db, 'players')), get(ref(db, 'matches'))]);
  const players = playersSnap.val() || {};
  const matches = { ...(matchesSnap.val() || {}) };
  delete matches[matchId];

  const { updatedPlayers, updatedMatches } = recalculateAllElo(players, matches);
  const updates = {};
  for (const [id, p] of Object.entries(updatedPlayers)) updates[`players/${id}`] = p;
  updates[`matches/${matchId}`] = null;
  for (const [id, m] of Object.entries(updatedMatches)) updates[`matches/${id}`] = m;
  await update(ref(db), updates);
}

/** Manual "Přepočítat Elo" admin button — idempotent, safe to run anytime. */
export async function manualRecalculateElo(db) {
  const [playersSnap, matchesSnap] = await Promise.all([get(ref(db, 'players')), get(ref(db, 'matches'))]);
  const players = playersSnap.val() || {};
  const matches = matchesSnap.val() || {};
  await writeRecalculatedElo(db, players, matches);
}

export async function requestDeletion(db, matchId) {
  const reqRef = push(ref(db, 'deletion_requests'));
  await set(reqRef, {
    match_id: matchId,
    requested_at: Date.now(),
    status: 'pending',
  });
  return reqRef.key;
}
