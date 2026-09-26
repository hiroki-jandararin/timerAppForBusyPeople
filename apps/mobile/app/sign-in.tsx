import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { useState } from 'react';
import * as Linking from 'expo-linking';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function signInWithEmail(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'サインインに失敗しました');
    throw new Error(text);
  }
  const data = await res.json();
  return data.accessToken as string;
}

async function signUpWithEmail(email: string, password: string): Promise<void> {
  const redirectTo = Linking.createURL('auth/callback');
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, redirect_to: redirectTo }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'サインアップに失敗しました');
    throw new Error(text);
  }
}

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        const token = await signInWithEmail(email.trim(), password);
        await signIn(token);
      } else {
        await signUpWithEmail(email.trim(), password);
        setSignUpDone(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setError('');
    setSignUpDone(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>QuickFit</Text>
        <Text style={styles.logoSub}>Timer</Text>

        {signUpDone ? (
          <View style={styles.form}>
            <Text style={styles.signUpDoneText}>
              確認メールを送信しました。{'\n'}メール内のリンクをクリックしてからサインインしてください。
            </Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => { setSignUpDone(false); setMode('signin'); }}
            >
              <Text style={styles.buttonText}>サインインへ</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="メールアドレス"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="パスワード"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {mode === 'signin' ? (
              <Text style={styles.hint}>※ アカウント作成後はメールの確認が必要です</Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'signin' ? 'サインイン' : 'アカウント作成'}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={switchMode} style={styles.switchBtn}>
              <Text style={styles.switchText}>
                {mode === 'signin'
                  ? 'アカウントをお持ちでない方はこちら'
                  : 'すでにアカウントをお持ちの方はこちら'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.orange,
    textAlign: 'center',
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textSub,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 48,
  },
  form: { gap: 12 },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
  },
  error: { color: Colors.red, fontSize: 13, textAlign: 'center' },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
  button: {
    backgroundColor: Colors.orange,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  switchBtn: { alignItems: 'center', marginTop: 4 },
  switchText: { color: Colors.textSub, fontSize: 13 },
  signUpDoneText: {
    color: Colors.text,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
});
