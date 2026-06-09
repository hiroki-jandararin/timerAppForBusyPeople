import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { ApiError, routineApiClient } from '@timeapp/api-client';
import { duplicateRoutine, type Routine } from '@timeapp/core';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

function totalSec(routine: Routine): number {
  return routine.items.reduce((sum, item) => sum + item.durationSec, 0);
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}分` : `${m}分${s}秒`;
}

function RoutineCard({
  routine,
  onPress,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  routine: Routine;
  onPress: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardAccent} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {routine.name}
        </Text>
        <Text style={styles.cardMeta}>
          {routine.items.length}種目　{formatDuration(totalSec(routine))}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.actionBtn} onPress={onEdit} hitSlop={8}>
          <Text style={styles.actionText}>編集</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onDuplicate} hitSlop={8}>
          <Text style={styles.actionText}>複製</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onDelete} hitSlop={8}>
          <Text style={[styles.actionText, { color: Colors.red }]}>削除</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function RoutinesScreen() {
  const { token, signOut } = useAuth();
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const api = routineApiClient({
    baseUrl: API_BASE_URL,
    getToken: () => token,
  });

  const load = useCallback(async () => {
    if (!token) return;
    setFetchError(false);
    try {
      const data = await api.getAll();
      setRoutines(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await signOut();
        return;
      }
      setFetchError(true);
    }
  }, [token]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDuplicate = async (routine: Routine) => {
    const copy = duplicateRoutine(routine);
    await api.create({ name: copy.name, items: copy.items });
    await load();
  };

  const handleDelete = (routine: Routine) => {
    Alert.alert('削除', `「${routine.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await api.delete(routine.id);
          setRoutines((prev) => prev.filter((r) => r.id !== routine.id));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={routines}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.orange}
          />
        }
        ListEmptyComponent={
          fetchError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>取得できませんでした</Text>
              <Pressable style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>再試行</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>ルーティンがありません</Text>
              <Text style={styles.emptySubText}>+ ボタンで作成しましょう</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onPress={() => router.push(`/(app)/routines/${item.id}/timer`)}
            onEdit={() => router.push(`/(app)/routines/${item.id}/edit`)}
            onDuplicate={() => handleDuplicate(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/(app)/routines/templates')}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.75 },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: Colors.orange,
  },
  cardBody: { flex: 1, paddingVertical: 16, paddingHorizontal: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardMeta: { fontSize: 13, color: Colors.textSub },
  cardActions: { flexDirection: 'row', gap: 4, paddingRight: 12 },
  actionBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  actionText: { fontSize: 13, color: Colors.textSub, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { color: Colors.textSub, fontSize: 16 },
  emptySubText: { color: Colors.textMuted, fontSize: 13 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  retryText: { color: Colors.orange, fontSize: 14, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: { opacity: 0.8 },
  fabText: { color: Colors.text, fontSize: 28, fontWeight: '300', marginTop: -2 },
});
