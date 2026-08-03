import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { signIn, type Provider } from '../auth/session';
import { colors, spacing, type } from '../theme';

interface Props {
  onSignedIn: () => void;
}

export function WelcomeScreen({ onSignedIn }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(provider: Provider) {
    setBusy(true);
    setError(null);
    try {
      await signIn(provider);
      onSignedIn();
    } catch {
      setError('Sign-in did not complete. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.title}>NeuroSemantics AI</Text>
        <Text style={styles.subtitle}>
          A quiet conversation partner for neurosemantics and NLP.
        </Text>
      </View>
      <View style={styles.actions}>
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.footnote}>Start free. No card required.</Text>
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
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: spacing.m,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: { ...type.heading },
  error: { ...type.caption, color: '#8A3B2E', textAlign: 'center', marginTop: spacing.s },
  footnote: { ...type.caption, textAlign: 'center', marginTop: spacing.m },
});
