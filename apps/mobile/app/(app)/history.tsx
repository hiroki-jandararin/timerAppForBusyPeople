import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import { workoutHistoryApiClient, ApiError } from '@timeapp/api-client';
import type { WorkoutHistory } from '@timeapp/core';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

function groupByDate(histories: WorkoutHistory[]): Map<string, WorkoutHistory[]> {
  const map = new Map<string, WorkoutHistory[]>();
  for (const h of histories) {
    const key = h.startedAt.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(h);
    map.set(key, list);
  }
  return map;
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calcCurrentStreak(byDate: Map<string, WorkoutHistory[]>): number {
  const today = new Date();
  const todayStr = toDateString(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toDateString(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  const startStr = byDate.has(todayStr)
    ? todayStr
    : byDate.has(yesterdayStr)
      ? yesterdayStr
      : null;
  if (!startStr) return 0;

  let streak = 0;
  const cursor = new Date(startStr + 'T00:00:00');
  for (let i = 0; i < 365; i++) {
    const d = toDateString(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (byDate.has(d)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function countThisMonth(byDate: Map<string, WorkoutHistory[]>): number {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let count = 0;
  for (const [date, hs] of byDate) {
    if (date.startsWith(prefix)) count += hs.length;
  }
  return count;
}

function formatClock(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function HistoryCard({ history }: { history: WorkoutHistory }) {
  const start = new Date(history.startedAt);
  const finish = new Date(history.finishedAt);
  const durationMin = Math.round((finish.getTime() - start.getTime()) / 60000);

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle}>{history.routineName}</Text>
          <Text style={styles.cardMeta}>
            {formatClock(history.startedAt)} 〜 {formatClock(history.finishedAt)}（{durationMin}分）
          </Text>
        </View>
        <View style={[styles.badge, history.completed ? styles.badgeCompleted : styles.badgeAborted]}>
          <Text style={[styles.badgeText, history.completed ? styles.badgeTextCompleted : styles.badgeTextAborted]}>
            {history.completed ? '完了' : '中断'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardItems}>
        {history.itemsCompleted} / {history.itemsCount} 種目
      </Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { token, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [histories, setHistories] = useState<WorkoutHistory[] | null>(null);

  const api = workoutHistoryApiClient({ baseUrl: API_BASE_URL, getToken: () => token });

  useEffect(() => {
    api.getAll().then(setHistories).catch((e) => {
      if (e instanceof ApiError && e.status === 401) signOut();
    });
  }, []);

  if (histories === null) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  const byDate = groupByDate(histories);
  const currentStreak = calcCurrentStreak(byDate);
  const thisMonthCount = countThisMonth(byDate);

  return (
    <FlatList
      data={histories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
      ListHeaderComponent={
        <View>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.title}>ワークアウト履歴</Text>
          </View>

          {/* 統計 */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardStreak]}>
              <Text style={styles.statValueStreak}>
                {currentStreak > 0 ? `🔥 ${currentStreak}` : `${currentStreak}`}
              </Text>
              <Text style={styles.statLabelStreak}>日連続</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{histories.length}</Text>
              <Text style={styles.statLabel}>通算回数</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{thisMonthCount}</Text>
              <Text style={styles.statLabel}>今月の回数</Text>
            </View>
          </View>

          {/* カレンダーヒートマップ */}
          <CalendarHeatmap
            markedDates={histories.map((h) => h.startedAt.slice(0, 10))}
          />

          {histories.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>まだ履歴がありません</Text>
              <Text style={styles.emptySubText}>タイマーを完了すると記録されます</Text>
            </View>
          )}

          {histories.length > 0 && (
            <Text style={styles.sectionLabel}>すべての記録</Text>
          )}
        </View>
      }
      renderItem={({ item }) => <HistoryCard history={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      style={{ backgroundColor: Colors.bg }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  content: { paddingHorizontal: 16, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backBtn: { paddingRight: 8, justifyContent: 'center' },
  backIcon: { color: Colors.textSub, fontSize: 28, lineHeight: 32 },
  title: { fontSize: 20, fontWeight: '900', color: Colors.text },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#1E1E21', borderRadius: 16,
    borderWidth: 1, borderColor: '#3C3C42', padding: 14, alignItems: 'center',
  },
  statCardStreak: { borderColor: '#FF6B3530', backgroundColor: '#FF6B3510' },
  statValue: { fontSize: 26, fontWeight: '900', color: Colors.text },
  statLabel: { fontSize: 9, fontWeight: '900', color: '#505058', letterSpacing: 1, marginTop: 4 },
  statValueStreak: { fontSize: 26, fontWeight: '900', color: Colors.orange },
  statLabelStreak: { fontSize: 9, fontWeight: '900', color: '#FF6B3580', letterSpacing: 1, marginTop: 4 },
  sectionLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  emptyState: { marginTop: 48, alignItems: 'center', gap: 6 },
  emptyText: { color: '#505058', fontSize: 14 },
  emptySubText: { color: '#3C3C42', fontSize: 12 },
  card: {
    backgroundColor: '#1E1E21', borderRadius: 14,
    borderWidth: 1, borderColor: '#3C3C42', padding: 14,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardMain: { flex: 1 },
  cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  cardMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  cardItems: { color: '#505058', fontSize: 11, marginTop: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeCompleted: { backgroundColor: '#22c55e20' },
  badgeAborted: { backgroundColor: '#EF444420' },
  badgeText: { fontSize: 10, fontWeight: '900' },
  badgeTextCompleted: { color: '#22c55e' },
  badgeTextAborted: { color: '#EF4444' },
});
