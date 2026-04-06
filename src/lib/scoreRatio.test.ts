import { describe, expect, it } from 'vitest';
import { scoreRatio } from './scoreRatio';

describe('scoreRatio', () => {
  it('returns correct / total', () => {
    expect(scoreRatio(3, 10)).toBe(0.3);
  });

  it('returns 0 when questionCount is non-positive', () => {
    expect(scoreRatio(1, 0)).toBe(0);
    expect(scoreRatio(1, -1)).toBe(0);
  });
});
