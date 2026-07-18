import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { authApiClient } from '@timeapp/api-client';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export default function AccountScreen() {
  const { token, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [deleting, setDeleting] = useState(false);

  const client = authApiClient({ baseUrl: API_BASE_URL, getToken: () => token });

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウントを削除',
      'アカウントを削除すると、すべてのデータが失われます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await client.deleteAccount();
              await signOut();
            } catch {
              setDeleting(false);
              Alert.alert('エラー', 'アカウントの削除に失敗しました。しばらく時間をおいて再試行してください。');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>アカウント</Text>
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.7 }, deleting && styles.disabled]}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          <Text style={styles.deleteButtonText}>アカウントを削除</Text>
        </Pressable>
        <Text style={styles.hint}>アカウントを削除すると、すべてのルーティンと履歴が完全に削除されます。</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 20,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
  },
  section: {
    gap: 12,
  },
  deleteButton: {
    backgroundColor: Colors.red,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
