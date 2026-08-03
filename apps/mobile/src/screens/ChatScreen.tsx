import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchSuggestions, sendChat, type ChatMessage } from '../api/client';
import { colors, spacing, type } from '../theme';

interface Props {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  /** The analysis is ready behind Premium; input is replaced by the unlock button. */
  paywalled: boolean;
  onPaywallTriggered: () => void;
  onContinueWithPremium: () => void;
  /** Set right after unlock: fetch the promised analysis automatically. */
  deliverAnalysis: boolean;
  onAnalysisDelivered: () => void;
}

const SUGGESTIONS_SHOWN = 4;

/**
 * The whole product: one heading, the conversation, a text field and send.
 * The user lands here directly — no registration before the first question.
 * Conversations live in memory only; nothing is stored.
 */
export function ChatScreen({
  messages,
  setMessages,
  paywalled,
  onPaywallTriggered,
  onContinueWithPremium,
  deliverAnalysis,
  onAnalysisDelivered,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    fetchSuggestions()
      .then((all) =>
        setSuggestions([...all].sort(() => Math.random() - 0.5).slice(0, SUGGESTIONS_SHOWN)),
      )
      .catch(() => setSuggestions([]));
  }, []);

  // After unlocking Premium the transcript ends with the assistant's
  // transition message; resend it so the backend delivers the full analysis.
  useEffect(() => {
    if (!deliverAnalysis || busy) return;
    setBusy(true);
    setError(null);
    sendChat(messages)
      .then(({ reply }) => {
        setMessages([...messages, { role: 'assistant', content: reply }]);
        onAnalysisDelivered();
      })
      .catch(() => setError('Something went wrong. Please try again.'))
      .finally(() => setBusy(false));
  }, [deliverAnalysis]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || busy || paywalled) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError(null);
    try {
      const { reply, paywall } = await sendChat(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
      if (paywall) onPaywallTriggered();
    } catch {
      setError('Something went wrong. Please try again.');
      setMessages(messages);
      setDraft(trimmed);
    } finally {
      setBusy(false);
    }
  }

  const showSuggestions = messages.length === 0 && suggestions.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.heading}>Semantika</Text>
      {showSuggestions ? (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable key={s} style={styles.suggestion} onPress={() => send(s)} disabled={busy}>
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={styles.empty}>What would you like to explore today?</Text>}
        renderItem={({ item }) => (
          <View style={[styles.message, item.role === 'user' ? styles.user : styles.assistant]}>
            <Text style={item.role === 'user' ? styles.userText : styles.assistantText}>
              {item.content}
            </Text>
          </View>
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {paywalled ? (
        <View style={styles.inputRow}>
          <Pressable style={styles.unlock} onPress={onContinueWithPremium}>
            <Text style={styles.unlockText}>Continue with Premium</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message"
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!busy}
          />
          <Pressable
            style={[styles.send, (!draft.trim() || busy) && styles.sendDisabled]}
            onPress={() => send(draft)}
            disabled={!draft.trim() || busy}
          >
            <Text style={styles.sendText}>{busy ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: {
    ...type.heading,
    textAlign: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.m,
  },
  suggestions: { paddingHorizontal: spacing.l, gap: spacing.s, marginBottom: spacing.m },
  suggestion: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: spacing.s + 2,
    paddingHorizontal: spacing.m,
  },
  suggestionText: { ...type.body, color: colors.accent },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.l, paddingBottom: spacing.m, gap: spacing.s },
  empty: { ...type.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  message: { maxWidth: '85%', borderRadius: 12, padding: spacing.m },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  userText: { ...type.body, color: colors.accentText },
  assistantText: { ...type.body },
  error: { ...type.caption, color: '#8A3B2E', textAlign: 'center', marginBottom: spacing.s },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.s,
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xl,
  },
  input: {
    flex: 1,
    ...type.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 2,
    maxHeight: 120,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m - 2,
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { ...type.heading, color: colors.accentText },
  unlock: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  unlockText: { ...type.heading, color: colors.accentText },
});
