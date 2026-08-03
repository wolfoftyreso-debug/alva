import { setSubscriptionStatus } from '../db.js';
import { appleProvider } from './apple.js';
import { googleProvider } from './google.js';
import type { PaymentProvider, VerifyPurchaseRequest } from './types.js';

const providers: Record<VerifyPurchaseRequest['platform'], PaymentProvider> = {
  ios: appleProvider,
  android: googleProvider,
};

/**
 * Verifies a purchase with the platform's store and updates the user's
 * subscription status. Returns the resulting status.
 */
export async function verifyAndApplyPurchase(
  userId: string,
  request: VerifyPurchaseRequest,
): Promise<'free' | 'active'> {
  const provider = providers[request.platform];
  const result = await provider.verify(request);
  const status = result.active ? 'active' : 'free';
  await setSubscriptionStatus(userId, status);
  return status;
}
