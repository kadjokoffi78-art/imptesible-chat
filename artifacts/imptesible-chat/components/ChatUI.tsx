import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export function Page({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[styles.page, { backgroundColor: c.background }, style]}>{children}</View>;
}

export function TopBar({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }) {
  const c = useColors();
  return <View style={styles.topbar}>
    {onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack} style={[styles.iconBtn, { backgroundColor: c.card }]}><Feather name="arrow-left" size={20} color={c.foreground} /></Pressable> : null}
    <View style={{ flex: 1 }}>
      <Text style={[styles.topTitle, { color: c.foreground }]}>{title}</Text>
      {subtitle ? <Text style={[styles.topSubtitle, { color: c.mutedForeground }]}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>;
}

export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const c = useColors();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: c.accentForeground, fontSize: size * 0.31, fontWeight: '700' }}>{initials || '•'}</Text>
  </View>;
}

export function ActionButton({ label, onPress, loading, disabled, variant = 'primary', icon }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'soft' | 'quiet'; icon?: keyof typeof Feather.glyphMap }) {
  const c = useColors();
  const bg = variant === 'primary' ? c.primary : variant === 'soft' ? c.secondary : 'transparent';
  const fg = variant === 'primary' ? c.primaryForeground : c.foreground;
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.action, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.78 : 1 }, variant === 'quiet' && { borderWidth: 1, borderColor: c.border }]}>
    {loading ? <ActivityIndicator color={fg} /> : icon ? <Feather name={icon} size={17} color={fg} /> : null}
    <Text style={[styles.actionText, { color: fg }]}>{loading ? 'Un instant…' : label}</Text>
  </Pressable>;
}

export function Field({ label, icon, ...props }: TextInputProps & { label: string; icon?: keyof typeof Feather.glyphMap }) {
  const c = useColors();
  return <View style={{ gap: 8 }}>
    <Text style={[styles.label, { color: c.foreground }]}>{label}</Text>
    <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
      {icon ? <Feather name={icon} size={17} color={c.mutedForeground} /> : null}
      <TextInput placeholderTextColor={c.mutedForeground} {...props} style={[styles.input, { color: c.foreground }, props.style]} />
    </View>
  </View>;
}

export function Notice({ title, body, action, loading }: { title: string; body: string; action?: React.ReactNode; loading?: boolean }) {
  const c = useColors();
  return <View style={[styles.notice, { backgroundColor: c.card, borderColor: c.border }]}>
    {loading ? <ActivityIndicator size="small" color={c.teal} /> : <View style={[styles.noticeMark, { backgroundColor: c.accent }]}><Feather name="message-circle" size={19} color={c.teal} /></View>}
    <Text style={[styles.noticeTitle, { color: c.foreground }]}>{title}</Text>
    <Text style={[styles.noticeBody, { color: c.mutedForeground }]}>{body}</Text>
    {action}
  </View>;
}

export const sharedStyles = StyleSheet.create({
  title: { fontFamily: 'serif', fontSize: 31, lineHeight: 37, fontWeight: '700', letterSpacing: -0.6 },
  body: { fontSize: 14, lineHeight: 21 },
});

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20 },
  topbar: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 9 },
  iconBtn: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 20, fontWeight: '700' },
  topSubtitle: { fontSize: 12, marginTop: 3 },
  action: { minHeight: 52, borderRadius: 17, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  actionText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '700' },
  field: { borderWidth: 1, borderRadius: 16, minHeight: 54, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15 },
  notice: { borderWidth: 1, borderRadius: 24, padding: 23, alignItems: 'center', gap: 11 },
  noticeMark: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  noticeBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 290 },
});
