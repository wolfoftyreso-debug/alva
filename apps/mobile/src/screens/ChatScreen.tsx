import { useRef, useState } from 'react';
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
import { ApiError, sendChat, type ChatMessage } from '../api/client';
import { colors, spacing, type } from '../theme';

interface Props {
  onLimitReached: () => void;
}

/**
 * The whole product: one heading, the conversation, a text field and send.
 * Conversations live in memory only — nothing is stored.
 */
export function ChatScreen({ onLimitReached }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function send() {
    const content = draft.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError(null);
    try {
      const { reply } = await sendChat(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        onLimitReached();
      } else {
        setError('Something went wrong. Please try again.');
        setMessages(messages);
        setDraft(content);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.heading}>NeuroSemantics AI</Text>
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
          onPress={send}
          disabled={!draft.trim() || busy}
        >
          <Text style={styles.sendText}>{busy ? '…' : 'Send'}</Text>
        </Pressable>
      </View>
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
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.l, paddingBottom: spacing.m, gap: spacing.s },
  empty: { ...type.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
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
});
