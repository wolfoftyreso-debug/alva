export type Platform = 'ios' | 'android';

export interface VerifyPurchaseRequest {
  platform: Platform;
  productId: string;
  /** iOS: base64 app receipt. Android: the purchase token from Play Billing. */
  receipt: string;
}

export interface VerificationResult {
  active: boolean;
  expiresAt?: Date;
}

/**
 * Shared subscription logic with per-platform payment providers.
 * A Stripe adapter can be added here for a future web version without
 * touching the rest of the backend.
 */
export interface PaymentProvider {
  verify(request: VerifyPurchaseRequest): Promise<VerificationResult>;
}
