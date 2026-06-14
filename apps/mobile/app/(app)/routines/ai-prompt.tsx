import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { generateAiRoutine } from '@/features/ai/aiRoutineService';
import { setPendingAiRoutine } from '@/features/ai/aiRoutineStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BODY_PARTS = [
  '胸', '背中', '肩', '腕（前）', '腕（後ろ）',
  '足（前）', '足（後ろ）', '腹筋', '背筋', 'ふくらはぎ',
] as const;

const DURATION_PRESETS = [10, 15, 20, 30, 45, 60] as const;

function buildPrompt(parts: string[], minutes: number, extra: string): string {
  const partStr = parts.join('・');
  let prompt = `${partStr}を${minutes}分で鍛えたい。`;
  if (extra.trim()) prompt += ` ${extra.trim()}`;
  return prompt;
}

export default function AiPromptScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [extra, setExtra] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = selectedParts.length > 0 && selectedMinutes !== null;

  function togglePart(part: string) {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    const prompt = buildPrompt(selectedParts, selectedMinutes!, extra);
    setIsLoading(true);
    setError(null);
    try {
      const routine = await generateAiRoutine(token, prompt, selectedMinutes! * 60);
      setPendingAiRoutine(routine);
      router.push('/(app)/routines/new');
    } catch {
      setError('生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.loadingText}>筋トレメニュー生成中...</Text>
        </View>
      )}

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹ 戻る</Text>
        </Pressable>
        <Text style={styles.title}>AIで作成</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 部位 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>どこを鍛える？</Text>
          <Text style={styles.sectionSub}>複数選択可</Text>
          <View style={styles.tagRow}>
            {BODY_PARTS.map((part) => {
              const active = selectedParts.includes(part);
              return (
                <Pressable
                  key={part}
                  onPress={() => togglePart(part)}
                  style={[styles.tag, active && styles.tagActive]}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{part}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 時間 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>トータル時間</Text>
          <View style={styles.tagRow}>
            {DURATION_PRESETS.map((min) => {
              const active = selectedMinutes === min;
              return (
                <Pressable
                  key={min}
                  onPress={() => setSelectedMinutes(min)}
                  style={[styles.tag, active && styles.tagActive]}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{min}分</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 追加リクエスト */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>追加のリクエスト <Text style={styles.sectionSub}>任意</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="例: 初心者向け、ダンベルなし"
            placeholderTextColor={Colors.textMuted}
            value={extra}
            onChangeText={setExtra}
            multiline
            returnKeyType="done"
            editable={!isLoading}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[styles.generateBtn, (!canGenerate || isLoading) && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={!canGenerate || isLoading}
        >
          <Text style={styles.generateBtnText}>生成する</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,15,17,0.85)',
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: { color: Colors.textSub, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  backBtn: {},
  backIcon: { color: Colors.textSub, fontSize: 13, fontWeight: '700' },
  title: { color: Colors.text, fontSize: 30, fontWeight: '900' },
  scroll: { padding: 16, gap: 12, paddingBottom: 48 },
  section: {
    backgroundColor: '#1E1E21',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { color: Colors.textSub, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  sectionSub: { color: '#505058', fontSize: 11, fontWeight: '400' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: '#2C2C30',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3C3C42',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  tagText: { color: Colors.textSub, fontSize: 13, fontWeight: '600' },
  tagTextActive: { color: Colors.text },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    minHeight: 60,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: '#EF444410',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  generateBtn: {
    backgroundColor: Colors.orange,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  generateBtnDisabled: { backgroundColor: '#505058' },
  generateBtnText: { color: Colors.text, fontSize: 16, fontWeight: '900' },
});
