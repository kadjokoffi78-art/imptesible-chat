import React from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getGetContactsQueryKey, useGetContacts, useRemoveContact } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Notice, Page, TopBar } from '@/components/ChatUI';
import { useColors } from '@/hooks/useColors';

export default function ContactsScreen() {
  const c = useColors();
  const client = useQueryClient();
  const contacts = useGetContacts({ query: { queryKey: getGetContactsQueryKey(), retry: false } });
  const remove = useRemoveContact();
  async function removeContact(userId: string, name: string) {
    const confirmed = await new Promise<boolean>((resolve) => Alert.alert('Retirer ce contact ?', `« ${name} » sera retiré de vos contacts.`, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Retirer', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }));
    if (!confirmed) return;
    try {
      await remove.mutateAsync({ userId });
      await client.invalidateQueries({ queryKey: getGetContactsQueryKey() });
    } catch {
      Alert.alert('Action impossible', 'Vérifiez votre connexion puis réessayez.');
    }
  }
  return <Page style={{ paddingHorizontal: 0 }}>
    <View style={{ paddingHorizontal: 20 }}><TopBar title="Contacts" subtitle="Les personnes que vous avez ajoutées" onBack={() => router.back()} right={<Pressable accessibilityRole="button" accessibilityLabel="Ajouter un contact" onPress={() => router.push('/search')} style={[styles.add, { backgroundColor: c.primary }]}><Feather name="user-plus" size={18} color={c.primaryForeground} /></Pressable>} /></View>
    {contacts.isLoading ? <View style={{ paddingHorizontal: 20, gap: 11, marginTop: 20 }}>{[0,1,2].map((n) => <View key={n} style={[styles.skeleton, { backgroundColor: c.muted }]} />)}</View>
      : contacts.isError ? <View style={styles.empty}><Notice title="Vos contacts ne sont pas disponibles" body="Vérifiez votre connexion puis rechargez la liste." action={<Pressable onPress={() => contacts.refetch()} style={[styles.retry, { backgroundColor: c.secondary }]}><Text style={{ color: c.foreground, fontWeight: '700' }}>Réessayer</Text></Pressable>} /></View>
      : (contacts.data ?? []).length === 0 ? <View style={styles.empty}><Notice title="Votre carnet est encore vide" body="Recherchez une personne avec son numéro pour l’ajouter ici." action={<Pressable onPress={() => router.push('/search')} style={[styles.retry, { backgroundColor: c.primary }]}><Text style={{ color: c.primaryForeground, fontWeight: '700' }}>Ajouter un contact</Text></Pressable>} /></View>
      : <FlatList data={contacts.data ?? []} keyExtractor={(item) => item.user.id} refreshControl={<RefreshControl refreshing={contacts.isRefetching} onRefresh={() => contacts.refetch()} tintColor={c.teal} />} contentContainerStyle={{ paddingBottom: 25 }} renderItem={({ item }) => <View style={[styles.row, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.push(`/chat/${item.conversationId}`)} style={styles.person}><Avatar name={item.user.username} size={50} /><View style={{ flex: 1 }}><Text style={[styles.name, { color: c.foreground }]}>{item.user.username}</Text><Text style={[styles.phone, { color: c.mutedForeground }]}>{item.user.phone}</Text></View></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${item.user.username}`} onPress={() => removeContact(item.user.id, item.user.username)} disabled={remove.isPending} style={[styles.remove, { backgroundColor: c.muted }]}><Feather name="user-minus" size={17} color={c.mutedForeground} /></Pressable>
      </View>} />}
  </Page>;
}

const styles = StyleSheet.create({
  add: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  row: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13 },
  name: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  phone: { fontSize: 12 },
  remove: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 70 },
  retry: { borderRadius: 13, paddingHorizontal: 16, paddingVertical: 12, marginTop: 6 },
  skeleton: { height: 64, borderRadius: 18 },
});
