import { describe, it, expect } from 'vitest';
import { getHeadToHead, getNemesis, getWeeklyRecap, getTrainingStats } from './useStats.js';

function match(timestamp, results, overrides = {}) {
  return { timestamp, mode: 'multiplayer', is_invalidated: false, results, ...overrides };
}

describe('getHeadToHead', () => {
  it('counts wins/losses/draws between two players, ignoring other matches and invalidated ones', () => {
    const matches = {
      m1: match(1, [{ player_id: 'a', rank: 1 }, { player_id: 'b', rank: 2 }]),
      m2: match(2, [{ player_id: 'a', rank: 2 }, { player_id: 'b', rank: 1 }]),
      m3: match(3, [{ player_id: 'a', rank: 1 }, { player_id: 'b', rank: 1 }]),
      m4: match(4, [{ player_id: 'a', rank: 1 }, { player_id: 'c', rank: 2 }]),
      m5: match(5, [{ player_id: 'a', rank: 1 }, { player_id: 'b', rank: 2 }], { is_invalidated: true }),
    };
    expect(getHeadToHead(matches, 'a', 'b')).toEqual({ wins: 1, losses: 1, draws: 1 });
  });
});

describe('getNemesis', () => {
  it('returns the opponent with the worst ratio, respecting minGames', () => {
    const matches = {
      m1: match(1, [{ player_id: 'a', rank: 2 }, { player_id: 'b', rank: 1 }]),
      m2: match(2, [{ player_id: 'a', rank: 2 }, { player_id: 'b', rank: 1 }]),
      m3: match(3, [{ player_id: 'a', rank: 2 }, { player_id: 'b', rank: 1 }]),
      m4: match(4, [{ player_id: 'a', rank: 1 }, { player_id: 'c', rank: 2 }]),
      m5: match(5, [{ player_id: 'a', rank: 1 }, { player_id: 'c', rank: 2 }]),
    };
    expect(getNemesis(matches, 'a')).toEqual({ opponentId: 'b', wins: 0, losses: 3 });
  });

  it('returns null when no opponent meets minGames', () => {
    const matches = {
      m1: match(1, [{ player_id: 'a', rank: 2 }, { player_id: 'b', rank: 1 }]),
    };
    expect(getNemesis(matches, 'a')).toBeNull();
  });
});

describe('getWeeklyRecap', () => {
  it('computes totals within Monday-Sunday bounds', () => {
    // Wednesday 2026-07-08
    const referenceDate = new Date(2026, 6, 8, 12, 0, 0);
    const matches = {
      inWeek1: match(new Date(2026, 6, 6, 10).getTime(), [
        { player_id: 'a', rank: 1, elo_change: 10 },
        { player_id: 'b', rank: 2, elo_change: -10 },
      ]),
      inWeek2: match(new Date(2026, 6, 9, 10).getTime(), [
        { player_id: 'a', rank: 1, elo_change: 5 },
        { player_id: 'c', rank: 2, elo_change: -5 },
      ]),
      outsideWeek: match(new Date(2026, 6, 13, 10).getTime(), [
        { player_id: 'a', rank: 1, elo_change: 100 },
        { player_id: 'b', rank: 2, elo_change: -100 },
      ]),
    };
    const recap = getWeeklyRecap(matches, {}, referenceDate);
    expect(recap.totalMatches).toBe(2);
    expect(recap.mostWins).toEqual({ playerId: 'a', count: 2 });
    expect(recap.bestForm).toEqual({ playerId: 'a', eloGain: 15 });
  });

  it('returns zeroed recap when there are no matches that week', () => {
    const recap = getWeeklyRecap({}, {}, new Date(2026, 6, 8));
    expect(recap).toEqual({ totalMatches: 0, mostWins: null, bestForm: null });
  });
});

describe('getTrainingStats', () => {
  it('computes best and average of last 10 trainings for the given player/game type', () => {
    const matches = {};
    const values = [30, 28, 25, 40, 27, 26, 29, 31, 24, 33, 22];
    values.forEach((darts_to_close, i) => {
      matches[`t${i}`] = {
        timestamp: i,
        mode: 'training',
        is_invalidated: false,
        game_type_id: 'gt_501',
        results: [{ player_id: 'p1', darts_to_close }],
      };
    });
    const stats = getTrainingStats(matches, 'p1', 'gt_501');
    expect(stats.best).toBe(22);
    // last 10 by timestamp desc excludes the oldest (index 0, value 30)
    const last10 = values.slice(1);
    const expectedAverage = Math.round((last10.reduce((s, v) => s + v, 0) / last10.length) * 10) / 10;
    expect(stats.average).toBe(expectedAverage);
  });

  it('returns nulls when the player has no trainings for that game type', () => {
    expect(getTrainingStats({}, 'p1', 'gt_501')).toEqual({ best: null, average: null });
  });
});
