import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

function Guard() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === 'sign-in';
    if (!token && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (token && inAuthGroup) {
      router.replace('/(app)/routines');
    }
  }, [token, isLoading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Guard />
    </AuthProvider>
  );
}
