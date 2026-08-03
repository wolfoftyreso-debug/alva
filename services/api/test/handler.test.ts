import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db.js', () => ({
  getOrCreateUser: vi.fn(),
  getUsage: vi.fn(),
  incrementUsage: vi.fn(),
  resetUsage: vi.fn(),
}));
vi.mock('../src/chat.js', () => ({
  generateReply: vi.fn(),
}));
vi.mock('../src/subscription/index.js', () => ({
  verifyAndApplyPurchase: vi.fn(),
}));

import { generateReply } from '../src/chat.js';
import { getOrCreateUser, getUsage, incrementUsage } from '../src/db.js';
import { handler } from '../src/handler.js';
import { verifyAndApplyPurchase } from '../src/subscription/index.js';

interface EventOptions {
  body?: unknown;
  claims?: Record<string, unknown>;
  headers?: Record<string, string>;
}

function makeEvent(method: string, path: string, opts: EventOptions = {}) {
  return {
    rawPath: path,
    headers: opts.headers ?? {},
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    requestContext: {
      http: { method },
      ...(opts.claims ? { authorizer: { jwt: { claims: opts.claims } } } : {}),
    },
    // The handler only reads the fields above.
  } as never;
}

async function call(method: string, path: string, opts: EventOptions = {}) {
  const result = (await handler(makeEvent(method, path, opts))) as {
    statusCode: number;
    body: string;
  };
  return { status: result.statusCode, body: JSON.parse(result.body) as Record<string, unknown> };
}

const freeUser = {
  id: 'user-1',
  email: 'a@b.se',
  auth_provider: 'email',
  subscription: 'free' as const,
  created_at: new Date(),
};
const premiumUser = { ...freeUser, subscription: 'active' as const };
const freshUsage = { user_id: 'user-1', messages_used: 0, last_reset: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOrCreateUser).mockResolvedValue(freeUser);
  vi.mocked(getUsage).mockResolvedValue(freshUsage);
  vi.mocked(generateReply).mockResolvedValue({ reply: 'A reply.', analysisReady: false });
});

describe('public routes', () => {
  it('serves suggestions without authentication', async () => {
    const { status, body } = await call('GET', '/suggestions');
    expect(status).toBe(200);
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect((body.suggestions as string[]).length).toBeGreaterThan(0);
  });

  it('rejects guest chat without a device id', async () => {
    const { status } = await call('POST', '/guest/chat', {
      body: { messages: [{ role: 'user', content: 'Hi' }] },
    });
    expect(status).toBe(400);
  });

  it('creates a guest user from the device id and chats', async () => {
    const { status, body } = await call('POST', '/guest/chat', {
      headers: { 'x-device-id': 'aaaa-bbbb-cccc' },
      body: { messages: [{ role: 'user', content: 'Hi' }] },
    });
    expect(status).toBe(200);
    expect(body.reply).toBe('A reply.');
    expect(getOrCreateUser).toHaveBeenCalledWith('guest:aaaa-bbbb-cccc', '', 'guest');
    expect(incrementUsage).toHaveBeenCalledWith('user-1');
  });
});

describe('authorization', () => {
  it('returns 401 on account routes without JWT claims', async () => {
    const { status } = await call('GET', '/me');
    expect(status).toBe(401);
  });

  it('derives the auth provider from the identities claim', async () => {
    await call('GET', '/me', {
      claims: { sub: 'sub-1', email: 'a@b.se', identities: '[{"providerName":"SignInWithApple"}]' },
    });
    expect(getOrCreateUser).toHaveBeenCalledWith('sub-1', 'a@b.se', 'apple');
  });
});

describe('chat and the intelligent paywall', () => {
  const claims = { sub: 'sub-1', email: 'a@b.se' };
  const userMessages = { messages: [{ role: 'user', content: 'Hi' }] };

  it('passes the paywall flag through when the analysis is ready', async () => {
    vi.mocked(generateReply).mockResolvedValue({ reply: 'Transition.', analysisReady: true });
    const { status, body } = await call('POST', '/chat', { claims, body: userMessages });
    expect(status).toBe(200);
    expect(body).toEqual({ reply: 'Transition.', paywall: true });
    expect(generateReply).toHaveBeenCalledWith(userMessages.messages, 'free');
  });

  it('runs premium chats in premium mode', async () => {
    vi.mocked(getOrCreateUser).mockResolvedValue(premiumUser);
    await call('POST', '/chat', { claims, body: userMessages });
    expect(generateReply).toHaveBeenCalledWith(userMessages.messages, 'premium');
  });

  it('rejects a transcript ending with an assistant message for free users', async () => {
    const { status } = await call('POST', '/chat', {
      claims,
      body: { messages: [{ role: 'assistant', content: 'Transition.' }] },
    });
    expect(status).toBe(400);
  });

  it('accepts an assistant-final transcript for premium users (post-unlock delivery)', async () => {
    vi.mocked(getOrCreateUser).mockResolvedValue(premiumUser);
    const { status } = await call('POST', '/chat', {
      claims,
      body: { messages: [{ role: 'assistant', content: 'Transition.' }] },
    });
    expect(status).toBe(200);
  });

  it('enforces the abuse cap for free users with 402', async () => {
    vi.mocked(getUsage).mockResolvedValue({ ...freshUsage, messages_used: 100000 });
    const { status, body } = await call('POST', '/chat', { claims, body: userMessages });
    expect(status).toBe(402);
    expect(body.error).toBe('message_cap_reached');
  });

  it('never blocks premium users on the cap', async () => {
    vi.mocked(getOrCreateUser).mockResolvedValue(premiumUser);
    vi.mocked(getUsage).mockResolvedValue({ ...freshUsage, messages_used: 100000 });
    const { status } = await call('POST', '/chat', { claims, body: userMessages });
    expect(status).toBe(200);
  });
});

describe('purchase verification', () => {
  const claims = { sub: 'sub-1', email: 'a@b.se' };

  it('validates the request body', async () => {
    const { status } = await call('POST', '/subscription/verify', {
      claims,
      body: { platform: 'windows', productId: 'x' },
    });
    expect(status).toBe(400);
  });

  it('returns the resulting subscription status', async () => {
    vi.mocked(verifyAndApplyPurchase).mockResolvedValue('active');
    const { status, body } = await call('POST', '/subscription/verify', {
      claims,
      body: { platform: 'ios', productId: 'semantika_monthly', receipt: 'abc' },
    });
    expect(status).toBe(200);
    expect(body.subscriptionStatus).toBe('active');
  });
});
