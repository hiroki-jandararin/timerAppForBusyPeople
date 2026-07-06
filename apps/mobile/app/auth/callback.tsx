import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

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

    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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
