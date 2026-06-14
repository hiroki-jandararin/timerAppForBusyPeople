import { Colors } from '@/constants/colors';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateMethodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>新規作成</Text>
        <Text style={styles.subtitle}>どんな方法で作りますか？</Text>

        <View style={styles.cards}>
          {/* AIで作成 */}
          <Pressable
            style={({ pressed }) => [styles.card, styles.cardAi, pressed && styles.cardPressed]}
            onPress={() => router.push('/(app)/routines/ai-prompt')}
          >
            <View style={[styles.cardAccent, styles.cardAccentAi]} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, styles.cardTitleAi]}>AIで作成</Text>
              <Text style={styles.cardDesc}>鍛えたい部位・時間を選ぶだけで自動生成</Text>
            </View>
          </Pressable>

          {/* テンプレートから選ぶ */}
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push('/(app)/routines/templates')}
          >
            <View style={styles.cardAccent} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>テンプレートから選ぶ</Text>
              <Text style={styles.cardDesc}>用意されたメニューをベースにカスタマイズ</Text>
            </View>
          </Pressable>

          {/* 最初から作る */}
          <Pressable
            style={({ pressed }) => [styles.card, styles.cardBlank, pressed && styles.cardPressed]}
            onPress={() => router.push('/(app)/routines/new')}
          >
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>最初から作る</Text>
              <Text style={[styles.cardDesc, styles.cardDescMuted]}>何も入っていない状態から作成</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, paddingBottom: 48 },
  title: { color: Colors.text, fontSize: 34, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#505058', fontSize: 13, fontWeight: '700', marginTop: 4, marginBottom: 24 },
  cards: { gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    overflow: 'hidden',
  },
  cardAi: { borderColor: '#FF6B3545', backgroundColor: '#FF6B3508' },
  cardBlank: { backgroundColor: '#1E1E21' },
  cardPressed: { opacity: 0.75 },
  cardAccent: { height: 3, backgroundColor: '#3C3C42' },
  cardAccentAi: { backgroundColor: Colors.orange },
  cardBody: { padding: 16 },
  cardTitle: { color: Colors.text, fontSize: 17, fontWeight: '900' },
  cardTitleAi: { color: Colors.orange },
  cardDesc: { color: Colors.textSub, fontSize: 13, marginTop: 4 },
  cardDescMuted: { color: '#505058' },
});
