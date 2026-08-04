import { describe, expect, it } from 'vitest';
import { canSendMessage, shouldResetUsage } from '../src/usage.js';

describe('canSendMessage', () => {
  it('allows messages under the free limit', () => {
    expect(canSendMessage(0, 'free', 50)).toBe(true);
    expect(canSendMessage(49, 'free', 50)).toBe(true);
  });

  it('blocks free users at the limit', () => {
    expect(canSendMessage(50, 'free', 50)).toBe(false);
    expect(canSendMessage(51, 'free', 50)).toBe(false);
  });

  it('never blocks active subscribers', () => {
    expect(canSendMessage(10_000, 'active', 50)).toBe(true);
  });
});

describe('shouldResetUsage', () => {
  const day = 24 * 60 * 60 * 1000;

  it('does not reset within the window', () => {
    const now = new Date();
    expect(shouldResetUsage(new Date(now.getTime() - 29 * day), now, 30)).toBe(false);
  });

  it('resets once the window has passed', () => {
    const now = new Date();
    expect(shouldResetUsage(new Date(now.getTime() - 30 * day), now, 30)).toBe(true);
  });
});
