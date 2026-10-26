import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useQueryClient } from '@tanstack/react-query';
import { getGetConversationsQueryKey, getGetMessagesQueryKey, getGetMeQueryKey, useGetConversations, useGetMe, useGetMessages, useSendMessage } from '@workspace/api-client-react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Notice, Page } from '@/components/ChatUI';
import { useColors } from '@/hooks/useColors';

export default function ChatScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const { conversationId: param } = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = Array.isArray(param) ? param[0] : param ?? '';
  const [content, setContent] = useState('');
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const conversations = useGetConversations({ query: { queryKey: getGetConversationsQueryKey(), retry: false } });
  const messages = useGetMessages(conversationId, undefined, { query: { queryKey: getGetMessagesQueryKey(conversationId), enabled: !!conversationId, refetchInterval: 3000, retry: false } });
  const send = useSendMessage();
  const conversation = conversations.data?.find((item) => item.id === conversationId);
  const ordered = useMemo(() => [...(messages.data ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).reverse(), [messages.data]);

  async function sendMessage() {
    const text = content.trim();
    if (!text || send.isPending || !conversationId) return;
    setContent('');
    try {
      await send.mutateAsync({ conversationId, data: { content: text } });
      await Promise.all([
        client.invalidateQueries({ queryKey: getGetMessagesQueryKey(conversationId) }),
        client.invalidateQueries({ queryKey: getGetConversationsQueryKey() }),
      ]);
    } catch {
      setContent(text);
    }
  }

  return <Page style={{ paddingHorizontal: 0 }}>
    <View style={{ paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <View style={styles.topbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour aux conversations" onPress={() => router.back()} style={[styles.back, { backgroundColor: c.card }]}><Feather name="arrow-left" size={20} color={c.foreground} /></Pressable>
        {conversation ? <Avatar name={conversation.peer.username} size={43} /> : <View style={[styles.unknown, { backgroundColor: c.accent }]}><Feather name="user" size={18} color={c.teal} /></View>}
        <View style={{ flex: 1 }}>
          <Text style={[styles.peer, { color: c.foreground }]}>{conversation?.peer.username ?? 'Conversation'}</Text>
          <Text style={[styles.status, { color: c.mutedForeground }]}>{conversation?.peer.phone ?? 'Échange privé'}</Text>
        </View>
      </View>
    </View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <FlatList
        inverted
        data={ordered}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 17, paddingVertical: 18, flexGrow: ordered.length === 0 ? 1 : undefined }}
        ListEmptyComponent={<View style={styles.empty}>
          {messages.isLoading ? <Notice loading title="Ouverture de la conversation" body="Nous chargeons les messages…" />
            : messages.isError ? <Notice title="Messages indisponibles" body="Vérifiez votre connexion puis réessayez." action={<Pressable onPress={() => messages.refetch()} style={[styles.retry, { backgroundColor: c.secondary }]}><Text style={{ color: c.foreground, fontWeight: '700' }}>Réessayer</Text></Pressable>} />
            : <Notice title="Le premier mot est à vous" body="Envoyez un message pour commencer cet échange." />}
        </View>}
        renderItem={({ item }) => {
          const mine = item.senderId === me.data?.id;
          return <View style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.bubble, mine ? { backgroundColor: c.navy, borderBottomRightRadius: 6 } : { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderBottomLeftRadius: 6 }]}>
              <Text style={[styles.message, { color: mine ? '#FFF8E8' : c.foreground }]}>{item.content}</Text>
              <Text style={[styles.timestamp, { color: mine ? '#B9C8C3' : c.mutedForeground }]}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>;
        }}
      />
      {send.error ? <Text style={[styles.sendError, { color: c.destructive }]}>Message non envoyé. Vérifiez votre connexion et réessayez.</Text> : null}
      <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: c.border, backgroundColor: c.background }]}>
        <View style={[styles.composer, { backgroundColor: c.card, borderColor: c.border }]}>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Écrire un message…"
            placeholderTextColor={c.mutedForeground}
            multiline
            maxLength={4000}
            style={[styles.input, { color: c.foreground }]}
            accessibilityLabel="Votre message"
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Envoyer le message" onPress={sendMessage} disabled={!content.trim() || send.isPending} style={[styles.send, { backgroundColor: content.trim() ? c.primary : c.muted, opacity: send.isPending ? 0.6 : 1 }]}>
            <Feather name="arrow-up" size={20} color={content.trim() ? c.primaryForeground : c.mutedForeground} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Page>;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  topbar: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11 },
  back: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  unknown: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  peer: { fontSize: 16, fontWeight: '700' },
  status: { fontSize: 12, marginTop: 3 },
  empty: { flex: 1, justifyContent: 'center', transform: [{ scaleY: -1 }] },
  bubbleRow: { flexDirection: 'row', marginVertical: 5 },
  bubble: { maxWidth: '83%', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, borderRadius: 18 },
  message: { fontSize: 15, lineHeight: 21 },
  timestamp: { alignSelf: 'flex-end', fontSize: 10, marginTop: 4 },
  composerWrap: { paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  composer: { minHeight: 53, maxHeight: 130, borderWidth: 1, borderRadius: 19, paddingLeft: 15, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 15, paddingTop: 14, paddingBottom: 12, maxHeight: 110 },
  send: { width: 41, height: 41, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sendError: { fontSize: 12, textAlign: 'center', paddingVertical: 5 },
  retry: { borderRadius: 13, paddingHorizontal: 16, paddingVertical: 12, marginTop: 6 },
});
