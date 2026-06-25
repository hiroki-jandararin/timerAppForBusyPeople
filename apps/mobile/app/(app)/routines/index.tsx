import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { ApiError, routineApiClient } from '@timeapp/api-client';
import { duplicateRoutine, type Routine } from '@timeapp/core';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

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
  const swipeableRef = useRef<Swipeable>(null);
  const menuBtnRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const openMenu = () => {
    menuBtnRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
      setMenuPos({ x: px, y: py });
      setMenuVisible(true);
    });
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1], extrapolate: 'clamp' });
    return (
      <Pressable
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Animated.Text style={[styles.deleteActionText, { transform: [{ scale }] }]}>
          削除
        </Animated.Text>
      </Pressable>
    );
  };

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} friction={2} rightThreshold={60}>
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
        <View ref={menuBtnRef} collapsable={false}>
          <Pressable style={styles.menuBtn} onPress={openMenu} hitSlop={8}>
            <Text style={styles.menuDots}>⋮</Text>
          </Pressable>
        </View>
      </Pressable>

      <Modal transparent visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuPopover, { top: menuPos.y - 8, left: menuPos.x - 100 }]}>
            <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); onEdit(); }}>
              <Text style={styles.menuItemText}>編集</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); onDuplicate(); }}>
              <Text style={styles.menuItemText}>複製</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Swipeable>
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
        onPress={() => router.push('/(app)/routines/create-method')}
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
  menuBtn: { paddingHorizontal: 14, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  menuDots: { fontSize: 20, color: Colors.textSub, lineHeight: 22 },
  menuOverlay: { flex: 1 },
  menuPopover: {
    position: 'absolute',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 12 },
  menuItemText: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: Colors.cardBorder },
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
  deleteAction: {
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
    marginLeft: 8,
  },
  deleteActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
