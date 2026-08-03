import { config } from '../config.js';
import { getSecret } from '../secrets.js';
import type { PaymentProvider, VerificationResult, VerifyPurchaseRequest } from './types.js';

const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
/** Apple status code meaning "this is a sandbox receipt, retry against sandbox". */
const STATUS_SANDBOX_RECEIPT = 21007;

interface AppleResponse {
  status: number;
  latest_receipt_info?: { product_id: string; expires_date_ms: string }[];
}

async function verifyReceipt(url: string, receipt: string, secret: string): Promise<AppleResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receipt,
      password: secret,
      'exclude-old-transactions': true,
    }),
  });
  if (!response.ok) throw new Error(`Apple receipt verification failed (${response.status})`);
  return (await response.json()) as AppleResponse;
}

export const appleProvider: PaymentProvider = {
  async verify(request: VerifyPurchaseRequest): Promise<VerificationResult> {
    const appSecret = await getSecret(config.appSecretArn);
    const sharedSecret = appSecret.APPLE_SHARED_SECRET;
    if (!sharedSecret) throw new Error('APPLE_SHARED_SECRET missing from application secret');

    let data = await verifyReceipt(PRODUCTION_URL, request.receipt, sharedSecret);
    if (data.status === STATUS_SANDBOX_RECEIPT) {
      data = await verifyReceipt(SANDBOX_URL, request.receipt, sharedSecret);
    }
    if (data.status !== 0) return { active: false };

    const latest = (data.latest_receipt_info ?? [])
      .filter((info) => info.product_id === request.productId)
      .map((info) => Number(info.expires_date_ms))
      .sort((a, b) => b - a)[0];
    if (!latest) return { active: false };

    return { active: latest > Date.now(), expiresAt: new Date(latest) };
  },
};
