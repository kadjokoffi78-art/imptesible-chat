import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { getGetContactsQueryKey, getGetConversationsQueryKey, getSearchUserQueryKey, useAddContact, useSearchUser } from '@workspace/api-client-react';
import { Avatar, Notice, Page, TopBar } from '@/components/ChatUI';
import { useColors } from '@/hooks/useColors';

export default function SearchScreen() {
  const c = useColors();
  const client = useQueryClient();
  const [phone, setPhone] = useState('');
  const exactPhone = phone.trim();
  const valid = exactPhone.length >= 8 && exactPhone.length <= 20;
  const search = useSearchUser({ phone: valid ? exactPhone : '00000000' }, { query: { queryKey: getSearchUserQueryKey({ phone: valid ? exactPhone : '00000000' }), enabled: valid, retry: false } });
  const add = useAddContact();

  async function addPerson() {
    try {
      const contact = await add.mutateAsync({ data: { phone: exactPhone } });
      await Promise.all([
        client.invalidateQueries({ queryKey: getGetContactsQueryKey() }),
        client.invalidateQueries({ queryKey: getGetConversationsQueryKey() }),
      ]);
      router.replace(`/chat/${contact.conversationId}`);
    } catch { /* mutation error remains visible */ }
  }

  return <Page style={{ paddingHorizontal: 0 }}>
    <View style={{ paddingHorizontal: 20 }}><TopBar title="Trouver une personne" subtitle="La recherche utilise le numéro complet" onBack={() => router.back()} /></View>
    <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 17 }}>
      <View style={[styles.searchField, { backgroundColor: c.card, borderColor: c.border }]}>
        <Feather name="phone" size={18} color={c.teal} />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="+225 07 00 00 00 00"
          placeholderTextColor={c.mutedForeground}
          style={[styles.input, { color: c.foreground }]}
          returnKeyType="search"
        />
        {phone.length > 0 ? <Pressable accessibilityLabel="Effacer le numéro" onPress={() => setPhone('')}><Feather name="x-circle" size={19} color={c.mutedForeground} /></Pressable> : null}
      </View>
      <Text style={[styles.helper, { color: c.mutedForeground }]}>Entrez le numéro tel qu’il est utilisé sur Imptébisible.</Text>
      {!valid ? <View style={styles.prompt}><View style={[styles.promptIcon, { backgroundColor: c.accent }]}><Feather name="search" size={20} color={c.teal} /></View><Text style={[styles.promptText, { color: c.mutedForeground }]}>Un numéro complet permet de trouver la bonne personne, sans approximation.</Text></View>
        : search.isLoading ? <View style={[styles.resultShell, { backgroundColor: c.card, borderColor: c.border }]}><ActivityIndicator color={c.teal} /><Text style={[styles.helper, { color: c.mutedForeground }]}>Recherche en cours…</Text></View>
        : search.isError ? <Notice title="Recherche indisponible" body="La connexion n’a pas abouti. Vérifiez votre réseau et réessayez." action={<Pressable onPress={() => search.refetch()} style={[styles.retry, { backgroundColor: c.secondary }]}><Text style={{ color: c.foreground, fontWeight: '700' }}>Réessayer</Text></Pressable>} />
        : search.data?.user ? <View style={[styles.resultShell, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.person}><Avatar name={search.data.user.username} size={56} /><View style={{ flex: 1 }}><Text style={[styles.name, { color: c.foreground }]}>{search.data.user.username}</Text><Text style={[styles.phone, { color: c.mutedForeground }]}>{search.data.user.phone}</Text></View></View>
          {search.data.isContact && search.data.conversationId
            ? <Pressable onPress={() => router.replace(`/chat/${search.data?.conversationId}`)} style={[styles.action, { backgroundColor: c.secondary }]}><Feather name="message-circle" size={17} color={c.teal} /><Text style={{ color: c.foreground, fontWeight: '700' }}>Ouvrir la conversation</Text></Pressable>
            : <Pressable accessibilityRole="button" onPress={addPerson} disabled={add.isPending} style={[styles.action, { backgroundColor: c.primary, opacity: add.isPending ? 0.65 : 1 }]}>{add.isPending ? <ActivityIndicator color={c.primaryForeground} /> : <Feather name="user-plus" size={17} color={c.primaryForeground} />}<Text style={{ color: c.primaryForeground, fontWeight: '700' }}>{add.isPending ? 'Ajout en cours…' : 'Ajouter et écrire'}</Text></Pressable>}
          {add.error ? <Text style={{ color: c.destructive, fontSize: 13 }}>{add.error.message || 'Impossible d’ajouter ce contact. Réessayez.'}</Text> : null}
        </View>
        : search.data ? <Notice title="Aucun compte trouvé" body="Aucune personne n’utilise ce numéro pour le moment. Vérifiez les chiffres saisis." /> : null}
    </View>
  </Page>;
}

const styles = StyleSheet.create({
  searchField: { minHeight: 57, borderRadius: 17, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  helper: { fontSize: 12, lineHeight: 18 },
  prompt: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 50, gap: 14 },
  promptIcon: { width: 54, height: 54, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  promptText: { textAlign: 'center', fontSize: 14, lineHeight: 21 },
  resultShell: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 18, minHeight: 120 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  name: { fontSize: 17, fontWeight: '700', marginBottom: 5 },
  phone: { fontSize: 13 },
  action: { minHeight: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  retry: { borderRadius: 13, paddingHorizontal: 16, paddingVertical: 12, marginTop: 6 },
});
