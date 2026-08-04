import { generateKeyPairSync } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

vi.mock('../src/secrets.js', () => ({
  getSecret: vi.fn(async () => ({
    APPLE_SHARED_SECRET: 'apple-secret',
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      client_email: 'svc@project.iam.gserviceaccount.com',
      private_key: privateKey,
    }),
  })),
}));

import { appleProvider } from '../src/subscription/apple.js';
import { googleProvider } from '../src/subscription/google.js';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

function jsonResponse(payload: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

describe('appleProvider', () => {
  const request = { platform: 'ios' as const, productId: 'semantika_monthly', receipt: 'r' };

  it('marks an unexpired subscription active', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 0,
        latest_receipt_info: [
          { product_id: 'semantika_monthly', expires_date_ms: String(Date.now() + 60_000) },
        ],
      }),
    );
    const result = await appleProvider.verify(request);
    expect(result.active).toBe(true);
  });

  it('retries against the sandbox on status 21007', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 21007 })).mockResolvedValueOnce(
      jsonResponse({
        status: 0,
        latest_receipt_info: [
          { product_id: 'semantika_monthly', expires_date_ms: String(Date.now() + 60_000) },
        ],
      }),
    );
    const result = await appleProvider.verify(request);
    expect(result.active).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('buy.itunes.apple.com');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('sandbox.itunes.apple.com');
  });

  it('marks an expired subscription inactive', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 0,
        latest_receipt_info: [
          { product_id: 'semantika_monthly', expires_date_ms: String(Date.now() - 60_000) },
        ],
      }),
    );
    const result = await appleProvider.verify(request);
    expect(result.active).toBe(false);
  });

  it('ignores receipts for other products', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 0,
        latest_receipt_info: [
          { product_id: 'something_else', expires_date_ms: String(Date.now() + 60_000) },
        ],
      }),
    );
    const result = await appleProvider.verify(request);
    expect(result.active).toBe(false);
  });
});

describe('googleProvider', () => {
  const request = { platform: 'android' as const, productId: 'semantika_yearly', receipt: 'token' };

  it('exchanges a signed JWT for a token and checks expiry', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'oauth-token' }))
      .mockResolvedValueOnce(jsonResponse({ expiryTimeMillis: String(Date.now() + 60_000) }));

    const result = await googleProvider.verify(request);
    expect(result.active).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://oauth2.googleapis.com/token');
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      '/purchases/subscriptions/semantika_yearly/tokens/token',
    );
    expect(fetchMock.mock.calls[1]?.[1]?.headers?.Authorization).toBe('Bearer oauth-token');
  });

  it('treats a gone purchase (410) as inactive', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'oauth-token' }))
      .mockResolvedValueOnce(jsonResponse({}, 410));
    const result = await googleProvider.verify(request);
    expect(result.active).toBe(false);
  });

  it('marks an expired purchase inactive', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'oauth-token' }))
      .mockResolvedValueOnce(jsonResponse({ expiryTimeMillis: String(Date.now() - 60_000) }));
    const result = await googleProvider.verify(request);
    expect(result.active).toBe(false);
  });
});
