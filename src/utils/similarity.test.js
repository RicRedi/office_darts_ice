import { describe, it, expect } from 'vitest';
import { findSimilarPlayer, levenshteinDistance, normalizeName } from './similarity.js';

describe('normalizeName', () => {
  it('trims, lowercases and strips diacritics', () => {
    expect(normalizeName('  Řehoř Novák  ')).toBe('rehor novak');
  });
});

describe('levenshteinDistance', () => {
  it('is 0 for identical strings', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });

  it('counts edits correctly', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('findSimilarPlayer', () => {
  const players = [
    { id: 'p1', name: 'Richard Ředina' },
    { id: 'p2', name: 'Jakub Hejč' },
  ];

  it('finds an exact match ignoring case/diacritics/whitespace', () => {
    expect(findSimilarPlayer('richard redina', players)).toEqual(players[0]);
  });

  it('finds a fuzzy match within Levenshtein distance 2 (typo)', () => {
    expect(findSimilarPlayer('Ricard Redina', players)).toEqual(players[0]);
  });

  it('returns null when no player is similar enough', () => {
    expect(findSimilarPlayer('Martin Matych', players)).toBeNull();
  });
});
