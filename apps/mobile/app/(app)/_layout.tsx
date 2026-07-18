import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { ActionSheetIOS, Pressable, StyleSheet, Text } from 'react-native';

function BackButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={12}>
      <Text style={{ color: Colors.text, fontSize: 17 }}>‹ 戻る</Text>
    </Pressable>
  );
}

function MenuButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handlePress = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['キャンセル', 'アカウント', 'サインアウト'],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 2,
      },
      (index) => {
        if (index === 1) router.push('/(app)/account');
        if (index === 2) signOut();
      }
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={12}
      style={({ pressed }) => [headerStyles.menuBtn, pressed && { opacity: 0.5 }]}
    >
      <Text style={headerStyles.menuDot}>•</Text>
      <Text style={headerStyles.menuDot}>•</Text>
      <Text style={headerStyles.menuDot}>•</Text>
    </Pressable>
  );
}

function HistoryButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/(app)/history')}
      hitSlop={8}
      style={({ pressed }) => [headerStyles.historyBtn, pressed && { opacity: 0.7 }]}
    >
      <Text style={headerStyles.historyIcon}>◷</Text>
      <Text style={headerStyles.historyText}>履歴</Text>
    </Pressable>
  );
}

const headerStyles = StyleSheet.create({
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginLeft: 4,
  },
  historyIcon: { color: Colors.orange, fontSize: 14, lineHeight: 17 },
  historyText: { color: Colors.orange, fontSize: 13, fontWeight: '700' },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  menuDot: { color: Colors.textSub, fontSize: 18, lineHeight: 20 },
});

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
          headerRight: () => <MenuButton />,
        }}
      />
      <Stack.Screen name="routines/new" options={{ headerShown: true, title: 'ルーティン作成', headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="routines/[id]/edit" options={{ headerShown: true, title: 'ルーティン編集', headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="routines/[id]/timer" options={{ headerShown: false }} />
      <Stack.Screen name="routines/create-method" options={{ headerShown: false }} />
      <Stack.Screen name="routines/templates" options={{ headerShown: true, title: 'テンプレート', headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
      <Stack.Screen name="routines/ai-prompt" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ headerShown: true, title: 'アカウント', headerLeft: () => <BackButton /> }} />
    </Stack>
  );
}
