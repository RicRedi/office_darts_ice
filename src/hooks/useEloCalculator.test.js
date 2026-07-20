import { describe, it, expect } from 'vitest';
import { calculateMultiplayerElo, recalculateAllElo, getKFactor } from './useEloCalculator.js';

describe('getKFactor', () => {
  it('returns 40 for players with fewer than 10 games', () => {
    expect(getKFactor(0)).toBe(40);
    expect(getKFactor(9)).toBe(40);
  });

  it('returns 32 for players with 10 or more games', () => {
    expect(getKFactor(10)).toBe(32);
    expect(getKFactor(50)).toBe(32);
  });
});

describe('calculateMultiplayerElo', () => {
  it('2 players, clear win: winner gains, loser loses the same amount', () => {
    const players = [
      { id: 'a', elo: 1000, gamesPlayed: 20, isGuest: false, rank: 1 },
      { id: 'b', elo: 1000, gamesPlayed: 20, isGuest: false, rank: 2 },
    ];
    const result = calculateMultiplayerElo(players);
    const a = result.find((r) => r.id === 'a');
    const b = result.find((r) => r.id === 'b');
    expect(a.eloChange).toBeGreaterThan(0);
    expect(b.eloChange).toBeLessThan(0);
    expect(a.eloChange).toBe(-b.eloChange);
  });

  it('3 players, draw at 2nd place', () => {
    const players = [
      { id: 'a', elo: 1000, gamesPlayed: 20, isGuest: false, rank: 1 },
      { id: 'b', elo: 1000, gamesPlayed: 20, isGuest: false, rank: 2 },
      { id: 'c', elo: 1000, gamesPlayed: 20, isGuest: false, rank: 2 },
    ];
    const result = calculateMultiplayerElo(players);
    const b = result.find((r) => r.id === 'b');
    const c = result.find((r) => r.id === 'c');
    // Equal starting Elo and equal rank -> identical change for the tied pair.
    expect(b.eloChange).toBe(c.eloChange);
    const a = result.find((r) => r.id === 'a');
    expect(a.eloChange).toBeGreaterThan(b.eloChange);
  });

  it('applies the 0.3 guest coefficient to a guest player only', () => {
    const basePlayers = [
      { id: 'a', elo: 1000, gamesPlayed: 20, isGuest: false, rank: 1 },
      { id: 'b', elo: 1000, gamesPlayed: 20, isGuest: false, rank: 2 },
    ];
    const guestPlayers = [
      { id: 'a', elo: 1000, gamesPlayed: 20, isGuest: false, rank: 2 },
      { id: 'guest', elo: 1000, gamesPlayed: 20, isGuest: true, rank: 1 },
    ];
    const baseResult = calculateMultiplayerElo(basePlayers);
    const guestResult = calculateMultiplayerElo(guestPlayers);
    const nonGuestChange = baseResult.find((r) => r.id === 'a').eloChange; // winner, non-guest
    const guestChange = guestResult.find((r) => r.id === 'guest').eloChange; // winner, guest

    expect(guestChange).toBe(Math.round(nonGuestChange * 0.3));
  });

  it('gives a higher effective K to a player with fewer than 10 games', () => {
    const players = [
      { id: 'novice', elo: 1000, gamesPlayed: 5, isGuest: false, rank: 1 },
      { id: 'veteran', elo: 1000, gamesPlayed: 50, isGuest: false, rank: 2 },
    ];
    const result = calculateMultiplayerElo(players);
    const novice = result.find((r) => r.id === 'novice');
    const veteran = result.find((r) => r.id === 'veteran');
    expect(Math.abs(novice.eloChange)).toBeGreaterThan(Math.abs(veteran.eloChange));
  });

  it('handles a single player (N=1) without dividing by zero', () => {
    const players = [{ id: 'solo', elo: 1000, gamesPlayed: 5, isGuest: false, rank: 1 }];
    const result = calculateMultiplayerElo(players);
    expect(result).toEqual([{ id: 'solo', eloChange: 0 }]);
  });
});

describe('recalculateAllElo', () => {
  const players = {
    p1: { name: 'Alice', is_guest: false },
    p2: { name: 'Bob', is_guest: false },
    p3: { name: 'Carl', is_guest: false },
  };

  function buildMatches() {
    return {
      m1: {
        timestamp: 1000,
        mode: 'multiplayer',
        is_invalidated: false,
        results: [
          { player_id: 'p1', rank: 1 },
          { player_id: 'p2', rank: 2 },
        ],
      },
      m2: {
        timestamp: 2000,
        mode: 'multiplayer',
        is_invalidated: false,
        results: [
          { player_id: 'p1', rank: 2 },
          { player_id: 'p3', rank: 1 },
        ],
      },
      m3: {
        timestamp: 3000,
        mode: 'multiplayer',
        is_invalidated: false,
        results: [
          { player_id: 'p2', rank: 1 },
          { player_id: 'p3', rank: 2 },
        ],
      },
    };
  }

  it('invalidating a match in the middle of history corrects Elo of later matches', () => {
    const matches = buildMatches();
    const before = recalculateAllElo(players, matches);
    const eloM3Before = before.updatedMatches.m3.results.map((r) => r.elo_before);

    const invalidated = {
      ...matches,
      m1: { ...matches.m1, is_invalidated: true },
    };
    const after = recalculateAllElo(players, invalidated);
    const eloM3After = after.updatedMatches.m3.results.map((r) => r.elo_before);

    expect(eloM3After).not.toEqual(eloM3Before);
    // p1 only has m2 left (lost to p3), so exactly one game counts now.
    expect(after.updatedPlayers.p1.games_played).toBe(1);
    expect(after.updatedPlayers.p1.elo).toBe(980);
  });

  it('is idempotent: running it twice on the same data gives the same result', () => {
    const matches = buildMatches();
    const first = recalculateAllElo(players, matches);
    const second = recalculateAllElo(first.updatedPlayers, first.updatedMatches);

    expect(second.updatedPlayers.p1.elo).toBe(first.updatedPlayers.p1.elo);
    expect(second.updatedPlayers.p2.elo).toBe(first.updatedPlayers.p2.elo);
    expect(second.updatedPlayers.p3.elo).toBe(first.updatedPlayers.p3.elo);
    expect(second.updatedMatches.m3.results).toEqual(first.updatedMatches.m3.results);
  });

  it('skips training matches entirely', () => {
    const matches = {
      ...buildMatches(),
      training1: {
        timestamp: 1500,
        mode: 'training',
        is_invalidated: false,
        results: [{ player_id: 'p1', darts_to_close: 27 }],
      },
    };
    const result = recalculateAllElo(players, matches);
    expect(result.updatedMatches.training1).toEqual(matches.training1);
  });
});
