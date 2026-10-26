import React, { useState } from 'react';
import { Image, Pressable, Text, View, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useLogin, useRegister, getGetMeQueryKey } from '@workspace/api-client-react';
import * as SecureStore from 'expo-secure-store';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ActionButton, Field, Page } from '@/components/ChatUI';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const login = useLogin();
  const register = useRegister();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const pending = login.isPending || register.isPending;
  const errorText = (login.error || register.error)?.message;

  async function onSubmit() {
    const normalizedPhone = phone.trim();
    if (normalizedPhone.length < 8 || normalizedPhone.length > 20 || password.length < 8) return;
    if (mode === 'register' && (username.trim().length < 2 || password !== confirm)) return;
    try {
      const session = mode === 'login'
        ? await login.mutateAsync({ data: { phone: normalizedPhone, password } })
        : await register.mutateAsync({ data: { username: username.trim(), phone: normalizedPhone, password } });
      await SecureStore.setItemAsync('imptesible-token', session.token);
      queryClient.setQueryData(getGetMeQueryKey(), session.user);
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      router.replace('/(tabs)');
    } catch {
      // Mutation error is rendered below.
    }
  }

  const canSubmit = phone.trim().length >= 8 && phone.trim().length <= 20 && password.length >= 8 &&
    (mode === 'login' || (username.trim().length >= 2 && password === confirm));

  return <Page style={{ paddingHorizontal: 0 }}>
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 16) + 18, paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 20) + 18 }]}
      bottomOffset={84}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brand}>
        <Image source={require('../assets/images/icon_2.png')} style={styles.logo} />
        <Text style={[styles.eyebrow, { color: c.teal }]}>CÔTE D’IVOIRE · PARTOUT</Text>
        <Text style={[styles.heading, { color: c.foreground }]}>Les mots nous{'\n'}rapprochent.</Text>
        <Text style={[styles.intro, { color: c.mutedForeground }]}>Une messagerie simple, pour garder le lien ici et au-delà.</Text>
      </View>
      <View style={[styles.panel, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.switcher, { backgroundColor: c.muted }]}>
          {(['login', 'register'] as const).map((m) => <Pressable key={m} onPress={() => { setMode(m); login.reset(); register.reset(); }} style={[styles.switchItem, mode === m && { backgroundColor: c.card, elevation: 1 }]}><Text style={{ color: mode === m ? c.foreground : c.mutedForeground, fontWeight: '700', fontSize: 13 }}>{m === 'login' ? 'Connexion' : 'Créer un compte'}</Text></Pressable>)}
        </View>
        <View style={{ gap: 15 }}>
          {mode === 'register' && <Field label="Nom d’utilisateur" icon="user" value={username} onChangeText={setUsername} autoCapitalize="words" returnKeyType="next" />}
          <Field label="Numéro de téléphone" icon="phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="+225 07 00 00 00 00" />
          <Field label="Mot de passe" icon="lock" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          {mode === 'register' && <Field label="Confirmer le mot de passe" icon="check" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />}
        </View>
        {mode === 'register' && password && password.length < 8 ? <Text style={[styles.hint, { color: c.mutedForeground }]}>8 caractères minimum.</Text> : null}
        {mode === 'register' && confirm && password !== confirm ? <Text style={[styles.error, { color: c.destructive }]}>Les mots de passe ne correspondent pas.</Text> : null}
        {errorText ? <Text accessibilityRole="alert" style={[styles.error, { color: c.destructive }]}>{errorText.includes('Network') ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorText}</Text> : null}
        <ActionButton label={mode === 'login' ? 'Se connecter' : 'Créer mon compte'} onPress={onSubmit} loading={pending} disabled={!canSubmit} icon="arrow-right" />
        <Text style={[styles.assurance, { color: c.mutedForeground }]}>Votre numéro est votre identifiant. Aucun code ni courriel à confirmer.</Text>
      </View>
      <Text style={[styles.footer, { color: c.mutedForeground }]}>Direct. Proche. Imptébisible.</Text>
    </KeyboardAwareScrollViewCompat>
  </Page>;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, gap: 26, flexGrow: 1, justifyContent: 'center' },
  brand: { alignItems: 'center', gap: 10 },
  logo: { width: 76, height: 76, borderRadius: 24, marginBottom: 5 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2.4 },
  heading: { textAlign: 'center', fontFamily: 'serif', fontSize: 37, fontWeight: '700', lineHeight: 41, letterSpacing: -0.8 },
  intro: { textAlign: 'center', fontSize: 14, lineHeight: 21, maxWidth: 285 },
  panel: { borderWidth: 1, borderRadius: 26, padding: 19, gap: 18 },
  switcher: { borderRadius: 14, flexDirection: 'row', padding: 4 },
  switchItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 11 },
  hint: { fontSize: 12, marginTop: -8 },
  error: { fontSize: 13, lineHeight: 19 },
  assurance: { textAlign: 'center', fontSize: 11, lineHeight: 17, paddingHorizontal: 10 },
  footer: { fontSize: 12, textAlign: 'center', letterSpacing: 1 },
});
