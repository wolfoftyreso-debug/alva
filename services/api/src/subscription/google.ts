import { createSign } from 'node:crypto';
import { config } from '../config.js';
import { getSecret } from '../secrets.js';
import type { PaymentProvider, VerificationResult, VerifyPurchaseRequest } from './types.js';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

/** Mints a Google OAuth access token from a service account key (RS256 JWT). */
async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(account.private_key).toString('base64url');
  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status})`);
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export const googleProvider: PaymentProvider = {
  async verify(request: VerifyPurchaseRequest): Promise<VerificationResult> {
    const appSecret = await getSecret(config.appSecretArn);
    const raw = appSecret.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON missing from application secret');
    const account = JSON.parse(raw) as ServiceAccount;

    const token = await getAccessToken(account);
    const url =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
      `${config.androidPackageName}/purchases/subscriptions/` +
      `${encodeURIComponent(request.productId)}/tokens/${encodeURIComponent(request.receipt)}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 404 || response.status === 410) return { active: false };
    if (!response.ok) throw new Error(`Google purchase lookup failed (${response.status})`);

    const data = (await response.json()) as { expiryTimeMillis?: string };
    const expiry = Number(data.expiryTimeMillis ?? 0);
    return { active: expiry > Date.now(), expiresAt: expiry ? new Date(expiry) : undefined };
  },
};
