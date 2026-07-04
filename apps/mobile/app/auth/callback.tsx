import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export default function AuthCallbackScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const url = Linking.getLinkingURL();
    if (url) handleUrl(url);
  }, []);

  async function handleUrl(url: string) {
    const fragment = url.split('#')[1] ?? '';
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');

    if (!accessToken) {
      router.replace('/sign-in');
      return;
    }

    // トークンを検証してセッションを確立する
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY },
    });

    if (!res.ok) {
      router.replace('/sign-in');
      return;
    }

    await signIn(accessToken);
    router.replace('/(app)/routines');
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
