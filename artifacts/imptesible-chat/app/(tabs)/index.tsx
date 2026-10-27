import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { getGetConversationsQueryKey, getGetMeQueryKey, useGetConversations, useGetMe, useLogout } from '@workspace/api-client-react';
import * as SecureStore from 'expo-secure-store';
import { Avatar, Notice, Page, TopBar, sharedStyles } from '@/components/ChatUI';
import { useColors } from '@/hooks/useColors';

export default function ConversationsScreen() {
  const c = useColors();
  const client = useQueryClient();
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const conversations = useGetConversations({ query: { queryKey: getGetConversationsQueryKey(), enabled: !!me.data, retry: false } });
  const logout = useLogout();

  async function signOut() {
    try { await logout.mutateAsync(); } catch { /* local sign-out still clears credentials */ }
    await SecureStore.deleteItemAsync('imptesible-token');
    client.clear();
    router.replace('/auth');
  }

  const items = conversations.data ?? [];
  return <Page style={{ paddingHorizontal: 0 }}>
    <View style={[styles.header, { paddingTop: 12 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.eyebrow, { color: c.teal }]}>VOTRE ESPACE</Text>
        <Text style={[sharedStyles.title, { color: c.foreground }]}>Bonjour{me.data?.username ? `, ${me.data.username}` : ''}.</Text>
      </View>
      <Pressable accessibilityLabel="Se déconnecter" accessibilityRole="button" onPress={signOut} style={[styles.roundBtn, { backgroundColor: c.card, borderColor: c.border }]}><Feather name="log-out" size={18} color={c.foreground} /></Pressable>
    </View>
    <View style={[styles.searchCard, { backgroundColor: c.navy }]}>
      <View style={[styles.searchGlyph, { backgroundColor: '#24474D' }]}><Feather name="search" size={20} color={c.gold} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.searchTitle}>Retrouver quelqu’un</Text>
        <Text style={styles.searchSub}>Cherchez par numéro exact</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Rechercher un contact" onPress={() => router.push('/search')} style={styles.arrow}><Feather name="arrow-up-right" size={20} color={c.navy} /></Pressable>
      <Pressable onPress={() => router.push('/search')} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Ouvrir la recherche" />
    </View>
    <View style={styles.listHead}>
      <Text style={[styles.sectionTitle, { color: c.foreground }]}>Conversations</Text>
      <Pressable onPress={() => router.push('/contacts')} accessibilityRole="button" style={styles.contactsLink}>
        <Feather name="users" size={15} color={c.teal} /><Text style={{ color: c.teal, fontWeight: '700', fontSize: 13 }}>Contacts</Text>
      </Pressable>
    </View>
    {conversations.isLoading ? <View style={{ gap: 12, paddingHorizontal: 20 }}>{[0,1,2].map((i) => <View key={i} style={[styles.skeleton, { backgroundColor: c.muted }]} />)}</View>
      : conversations.isError ? <View style={{ paddingHorizontal: 20, marginTop: 24 }}><Notice title="Impossible de charger les conversations" body="Vérifiez votre connexion puis réessayez." action={<Pressable onPress={() => conversations.refetch()} style={[styles.retry, { backgroundColor: c.secondary }]}><Text style={{ color: c.foreground, fontWeight: '700' }}>Réessayer</Text></Pressable>} /></View>
      : items.length === 0 ? <View style={styles.emptyWrap}><Notice title="La conversation commence ici" body="Ajoutez une personne avec son numéro pour ouvrir votre premier échange." action={<Pressable onPress={() => router.push('/search')} style={[styles.retry, { backgroundColor: c.primary }]}><Text style={{ color: c.primaryForeground, fontWeight: '700' }}>Chercher une personne</Text></Pressable>} /></View>
      : <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={conversations.isRefetching} onRefresh={() => conversations.refetch()} tintColor={c.teal} />}
        contentContainerStyle={{ paddingBottom: 26 }}
        renderItem={({ item }) => <Pressable onPress={() => router.push(`/chat/${item.id}`)} style={({ pressed }) => [styles.conversation, { backgroundColor: pressed ? c.secondary : 'transparent', borderBottomColor: c.border }]}>
          <Avatar name={item.peer.username} size={54} />
          <View style={{ flex: 1, gap: 5 }}>
            <View style={styles.nameLine}><Text style={[styles.peer, { color: c.foreground }]} numberOfLines={1}>{item.peer.username}</Text><Text style={[styles.time, { color: c.mutedForeground }]}>{item.lastMessage ? formatTime(item.lastMessage) : ''}</Text></View>
            <Text style={[styles.preview, { color: c.mutedForeground }]} numberOfLines={1}>{item.lastMessage || 'Démarrer la conversation'}</Text>
          </View>
        </Pressable>}
      />}
  </Page>;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 21, paddingBottom: 19, flexDirection: 'row', alignItems: 'center', gap: 14 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2.2, marginBottom: 7 },
  roundBtn: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchCard: { marginHorizontal: 20, borderRadius: 24, padding: 17, flexDirection: 'row', gap: 13, alignItems: 'center', overflow: 'hidden' },
  searchGlyph: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  searchTitle: { color: '#FFF8E8', fontSize: 16, fontWeight: '700' },
  searchSub: { color: '#B9C8C3', fontSize: 12 },
  arrow: { backgroundColor: '#F4A900', width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  listHead: { paddingHorizontal: 21, marginTop: 30, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  contactsLink: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  conversation: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 21, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  nameLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  peer: { fontSize: 15, fontWeight: '700', flex: 1 },
  time: { fontSize: 11 },
  preview: { fontSize: 13 },
  skeleton: { height: 68, borderRadius: 19 },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 70 },
  retry: { borderRadius: 13, paddingHorizontal: 16, paddingVertical: 12, marginTop: 6 },
});
