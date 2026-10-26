import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useColors } from '@/hooks/useColors';

export default function IndexRoute() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync('imptesible-token').then((token) => {
      if (!active) return;
      if (token) queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      else router.replace('/auth');
    }).catch(() => router.replace('/auth'));
    return () => { active = false; };
  }, [queryClient]);
  useEffect(() => {
    if (me.data) router.replace('/(tabs)');
    else if (me.isError) router.replace('/auth');
  }, [me.data, me.isError]);
  return <View style={{ flex:  1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.teal} /></View>;
}
