import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { purchase, restore, type Plan } from '../purchases';
import { colors, spacing, type } from '../theme';

interface Props {
  onSubscribed: () => void;
}

export function PaywallScreen({ onSubscribed }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          You have used your free conversations. Subscribe to continue.
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => buy('monthly')} disabled={busy}>
          <Text style={styles.primaryButtonText}>Monthly</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => buy('yearly')} disabled={busy}>
          <Text style={styles.primaryButtonText}>Yearly</Text>
        </Pressable>
        <Pressable style={styles.restore} onPress={() => run(restore)} disabled={busy}>
          <Text style={styles.restoreText}>Restore Purchase</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
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
  restore: { alignItems: 'center', paddingVertical: spacing.m },
  restoreText: { ...type.body, color: colors.accent },
  error: { ...type.caption, color: '#8A3B2E', textAlign: 'center' },
});
