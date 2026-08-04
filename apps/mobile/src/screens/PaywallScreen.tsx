import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAccessToken, signIn, type Provider } from '../auth/session';
import {
  DEFAULT_PRICES,
  getPrices,
  purchase,
  restore,
  type Plan,
  type PlanPrices,
} from '../purchases';
import { colors, spacing, type } from '../theme';

interface Props {
  onSubscribed: () => void;
  onDismiss: () => void;
}

const PREMIUM_INCLUDES = [
  'Unlimited conversations',
  'Unlimited analyses',
  'Personalised guidance',
  'Future feature updates',
];

/**
 * Shown when the backend has a complete analysis ready. Guests sign in
 * first (purchases must attach to an account), then choose a plan.
 */
export function PaywallScreen({ onSubscribed, onDismiss }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [prices, setPrices] = useState<PlanPrices>(DEFAULT_PRICES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAccessToken().then((token) => setSignedIn(token !== null));
    getPrices().then(setPrices);
  }, []);

  async function handleSignIn(provider: Provider) {
    setBusy(true);
    setError(null);
    try {
      await signIn(provider);
      setSignedIn(true);
    } catch {
      setError('Sign-in did not complete. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<'free' | 'active'>) {
    setBusy(true);
    setError(null);
    try {
      const status = await action();
      if (status === 'active') {
        onSubscribed();
      } else {
        setError('No active subscription was found.');
      }
    } catch {
      setError('The purchase did not complete. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const buy = (plan: Plan) => run(() => purchase(plan));

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.title}>Continue your journey</Text>
        <Text style={styles.subtitle}>
          Your full analysis and personalised action plan are ready. Premium is the natural next
          step of the conversation you have already started.
        </Text>
        <View style={styles.includes}>
          {PREMIUM_INCLUDES.map((item) => (
            <Text key={item} style={styles.includesItem}>
              {item}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        {signedIn === false ? (
          <>
            <Pressable
              style={styles.primaryButton}
              onPress={() => handleSignIn('apple')}
              disabled={busy}
            >
              <Text style={styles.primaryButtonText}>Continue with Apple</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => handleSignIn('google')}
              disabled={busy}
            >
              <Text style={styles.secondaryButtonText}>Continue with Google</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => handleSignIn('email')}
              disabled={busy}
            >
              <Text style={styles.secondaryButtonText}>Continue with Email</Text>
            </Pressable>
          </>
        ) : signedIn === true ? (
          <>
            <Pressable style={styles.primaryButton} onPress={() => buy('monthly')} disabled={busy}>
              <Text style={styles.primaryButtonText}>Monthly</Text>
              <Text style={styles.priceText}>{prices.monthly}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => buy('yearly')} disabled={busy}>
              <Text style={styles.primaryButtonText}>Yearly</Text>
              <Text style={styles.priceText}>{prices.yearly}</Text>
            </Pressable>
            <Pressable style={styles.textButton} onPress={() => run(restore)} disabled={busy}>
              <Text style={styles.textButtonText}>Restore Purchase</Text>
            </Pressable>
          </>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.textButton} onPress={onDismiss} disabled={busy}>
          <Text style={styles.dismissText}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.l,
    justifyContent: 'space-between',
  },
  top: { marginTop: spacing.xxl * 2 },
  title: { ...type.title, textAlign: 'center' },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.m,
  },
  actions: { marginBottom: spacing.xxl, gap: spacing.s },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.m,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: { ...type.heading, color: colors.accentText },
  priceText: { ...type.caption, color: colors.accentText, marginTop: 2 },
  includes: { marginTop: spacing.l, gap: spacing.xs },
  includesItem: { ...type.caption, textAlign: 'center' },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: spacing.m,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: { ...type.heading },
  textButton: { alignItems: 'center', paddingVertical: spacing.m },
  textButtonText: { ...type.body, color: colors.accent },
  dismissText: { ...type.caption },
  error: { ...type.caption, color: '#8A3B2E', textAlign: 'center' },
});
