import { Platform } from 'react-native';
import {
  endConnection,
  getAvailablePurchases,
  getSubscriptions,
  initConnection,
  requestSubscription,
  type SubscriptionPurchase,
} from 'react-native-iap';
import { verifyPurchase } from '../api/client';
import { appConfig } from '../config';

export type Plan = 'monthly' | 'yearly';

export interface PlanPrices {
  monthly: string;
  yearly: string;
}

/** Shown until the store answers; real localized prices come from the store. */
export const DEFAULT_PRICES: PlanPrices = {
  monthly: '$5.99 / month',
  yearly: '$49.99 / year',
};

const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

export function productIdFor(plan: Plan): string {
  if (platform === 'ios') {
    return plan === 'monthly' ? appConfig.iosMonthlyProductId : appConfig.iosYearlyProductId;
  }
  return plan === 'monthly' ? appConfig.androidMonthlyProductId : appConfig.androidYearlyProductId;
}

function receiptOf(purchase: SubscriptionPurchase): string {
  // iOS: base64 app receipt. Android: Play Billing purchase token.
  return platform === 'ios' ? purchase.transactionReceipt : (purchase.purchaseToken ?? '');
}

async function withConnection<T>(fn: () => Promise<T>): Promise<T> {
  await initConnection();
  try {
    return await fn();
  } finally {
    await endConnection();
  }
}

function priceOf(product: unknown): string | undefined {
  if (!product) return undefined;
  // iOS exposes localizedPrice; Android nests it in the first offer's pricing phases.
  const p = product as {
    localizedPrice?: string;
    subscriptionOfferDetails?: {
      pricingPhases?: { pricingPhaseList?: { formattedPrice?: string }[] };
    }[];
  };
  return (
    p.localizedPrice ??
    p.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice
  );
}

/** Localized prices from the store, falling back to the defaults. */
export async function getPrices(): Promise<PlanPrices> {
  try {
    return await withConnection(async () => {
      const products = await getSubscriptions({
        skus: [productIdFor('monthly'), productIdFor('yearly')],
      });
      const find = (plan: Plan) => products.find((p) => p.productId === productIdFor(plan));
      return {
        monthly: priceOf(find('monthly')) ?? DEFAULT_PRICES.monthly,
        yearly: priceOf(find('yearly')) ?? DEFAULT_PRICES.yearly,
      };
    });
  } catch {
    return DEFAULT_PRICES;
  }
}

/**
 * Runs the native purchase flow, then lets the backend verify the receipt
 * with the store. Returns the resulting subscription status.
 */
export async function purchase(plan: Plan): Promise<'free' | 'active'> {
  const productId = productIdFor(plan);
  return withConnection(async () => {
    await requestSubscription({ sku: productId });
    const purchases = await getAvailablePurchases();
    const match = purchases.find((p) => p.productId === productId);
    if (!match) throw new Error('Purchase not found after transaction');
    const result = await verifyPurchase({ platform, productId, receipt: receiptOf(match) });
    return result.subscriptionStatus;
  });
}

/** Re-checks existing purchases with the store ("Restore Purchase"). */
export async function restore(): Promise<'free' | 'active'> {
  return withConnection(async () => {
    const purchases = await getAvailablePurchases();
    for (const p of purchases) {
      const result = await verifyPurchase({
        platform,
        productId: p.productId,
        receipt: receiptOf(p),
      });
      if (result.subscriptionStatus === 'active') return 'active';
    }
    return 'free';
  });
}
