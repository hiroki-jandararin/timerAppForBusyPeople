import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

export default function AuthCallbackScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>メール認証が完了しました</Text>
      <Text style={styles.sub}>
        サインイン画面でメールアドレスとパスワードを入力してください。
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.replace('/sign-in')}
      >
        <Text style={styles.buttonText}>サインイン画面へ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: 15,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.orange,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
});
