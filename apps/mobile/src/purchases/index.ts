import { Platform } from 'react-native';
import {
  endConnection,
  getAvailablePurchases,
  initConnection,
  requestSubscription,
  type SubscriptionPurchase,
} from 'react-native-iap';
import { verifyPurchase } from '../api/client';
import { appConfig } from '../config';

export type Plan = 'monthly' | 'yearly';

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
