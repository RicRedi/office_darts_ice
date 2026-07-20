import { describe, it, expect } from 'vitest';
import { generateIdenticon } from './identicon.js';

describe('generateIdenticon', () => {
  it('is deterministic: the same seed always returns the same SVG', () => {
    const a = generateIdenticon('player_uid_001');
    const b = generateIdenticon('player_uid_001');
    expect(a).toBe(b);
  });

  it('produces different output for different seeds', () => {
    const a = generateIdenticon('player_uid_001');
    const b = generateIdenticon('player_uid_002');
    expect(a).not.toBe(b);
  });

  it('returns a valid svg string', () => {
    const svg = generateIdenticon('anything');
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('</svg>');
  });
});
