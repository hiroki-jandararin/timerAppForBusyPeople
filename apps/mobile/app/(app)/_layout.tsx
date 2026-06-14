import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={signOut} hitSlop={8}>
      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>サインアウト</Text>
    </Pressable>
  );
}

function HistoryButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/(app)/history')} hitSlop={8}>
      <Text style={{ color: Colors.orange, fontSize: 13, fontWeight: '700' }}>履歴</Text>
    </Pressable>
  );
}

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: Colors.bg },
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="routines/index"
        options={{
          headerShown: true,
          title: 'マイルーティン',
          headerLeft: () => <HistoryButton />,
          headerRight: () => <SignOutButton />,
        }}
      />
      <Stack.Screen name="routines/new" options={{ headerShown: true, title: 'ルーティン作成', headerBackTitle: '戻る' }} />
      <Stack.Screen name="routines/[id]/edit" options={{ headerShown: true, title: 'ルーティン編集', headerBackTitle: '戻る' }} />
      <Stack.Screen name="routines/create-method" options={{ headerShown: false }} />
      <Stack.Screen name="routines/templates" options={{ headerShown: true, title: 'テンプレート', headerBackTitle: '戻る' }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
      <Stack.Screen name="routines/ai-prompt" options={{ headerShown: true, title: 'AIで作成', headerBackTitle: '戻る' }} />
    </Stack>
  );
}
