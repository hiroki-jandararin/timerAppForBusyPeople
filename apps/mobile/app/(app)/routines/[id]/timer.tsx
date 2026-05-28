import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { routineApiClient } from '@timeapp/api-client';
import type { Routine } from '@timeapp/core';
import {
  initialTimerState,
  timerReducer,
  type TimerAction,
} from '@timeapp/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerScreen() {
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [state, dispatch] = useReducer(timerReducer, initialTimerState);
  const progressAnim = useRef(new Animated.Value(1)).current;

  const api = routineApiClient({ baseUrl: API_BASE_URL, getToken: () => token });

  useEffect(() => {
    api.getById(id).then(setRoutine);
  }, [id]);

  // 1秒ごとのtick
  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'countdown') return;
    const interval = setInterval(() => {
      if (routine) dispatch({ type: 'tick', routine });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.status, routine]);

  // プログレスバーアニメーション
  useEffect(() => {
    if (!routine || state.status !== 'running') return;
    const currentItem = routine.items[state.currentIndex];
    if (!currentItem) return;
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: state.remainingSec * 1000,
      useNativeDriver: false,
    }).start();
  }, [state.currentIndex, state.status]);

  if (!routine) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  const currentItem = routine.items[state.currentIndex];
  const isInterval = currentItem?.type === 'interval';
  const accentColor = isInterval ? Colors.green : Colors.orange;

  const send = (action: TimerAction) => dispatch(action);

  // 完了画面
  if (state.status === 'finished') {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <Text style={styles.finishedEmoji}>🎉</Text>
        <Text style={styles.finishedTitle}>完了！</Text>
        <Text style={styles.finishedSub}>{routine.name}</Text>
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.doneBtnText}>一覧に戻る</Text>
        </Pressable>
      </View>
    );
  }

  // アイドル画面（スタート前）
  if (state.status === 'idle') {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <Text style={styles.routineName}>{routine.name}</Text>
        <Text style={styles.routineMeta}>
          {routine.items.length}種目
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: Colors.orange },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => send({ type: 'start', routine })}
        >
          <Text style={styles.startBtnText}>スタート</Text>
        </Pressable>
      </View>
    );
  }

  // カウントダウン画面
  if (state.status === 'countdown') {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <Text style={styles.countdownText}>{state.remainingSec}</Text>
        <Text style={styles.countdownSub}>準備してください</Text>
      </View>
    );
  }

  // 実行中 / 一時停止中
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* ヘッダー情報 */}
      <View style={styles.topInfo}>
        <Text style={styles.routineNameSmall}>{routine.name}</Text>
        <Text style={styles.indexInfo}>
          {state.currentIndex + 1} / {routine.items.length}
        </Text>
      </View>

      {/* メインエリア */}
      <View style={styles.mainArea}>
        <View style={[styles.itemTypeBadge, { backgroundColor: `${accentColor}20` }]}>
          <Text style={[styles.itemTypeText, { color: accentColor }]}>
            {isInterval ? '休憩' : '種目'}
          </Text>
        </View>

        <Text style={styles.itemTitle} numberOfLines={2}>
          {currentItem?.title ?? ''}
        </Text>

        <Text style={[styles.timerDisplay, { color: accentColor }]}>
          {formatTime(state.remainingSec)}
        </Text>
      </View>

      {/* プログレスバー */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressWidth, backgroundColor: accentColor },
          ]}
        />
      </View>

      {/* 次のアイテム */}
      {routine.items[state.currentIndex + 1] && (
        <Text style={styles.nextLabel}>
          次: {routine.items[state.currentIndex + 1].title}
        </Text>
      )}

      {/* コントロール */}
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.6 }]}
          onPress={() => send({ type: 'previous', routine })}
        >
          <Text style={styles.ctrlIcon}>⏮</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.playBtn,
            { backgroundColor: accentColor },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() =>
            send(state.status === 'paused' ? { type: 'resume' } : { type: 'pause' })
          }
        >
          <Text style={styles.playBtnIcon}>
            {state.status === 'paused' ? '▶' : '⏸'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.6 }]}
          onPress={() => send({ type: 'skip', routine })}
        >
          <Text style={styles.ctrlIcon}>⏭</Text>
        </Pressable>
      </View>

      <Pressable style={styles.finishLink} onPress={() => send({ type: 'finish' })}>
        <Text style={styles.finishLinkText}>終了する</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, gap: 16 },
  topInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  routineNameSmall: { color: Colors.textSub, fontSize: 14, fontWeight: '600' },
  indexInfo: { color: Colors.textMuted, fontSize: 14 },
  mainArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  itemTypeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  itemTypeText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  itemTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 36,
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  nextLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 32,
  },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32 },
  ctrlBtn: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  ctrlIcon: { fontSize: 28, color: Colors.textSub },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  playBtnIcon: { fontSize: 28, color: Colors.bg },
  finishLink: { marginTop: 24, alignItems: 'center' },
  finishLinkText: { color: Colors.textMuted, fontSize: 13 },
  // idle
  routineName: { fontSize: 28, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  routineMeta: { color: Colors.textSub, fontSize: 16 },
  startBtn: {
    marginTop: 16,
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 50,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnText: { color: Colors.bg, fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  // countdown
  countdownText: { fontSize: 120, fontWeight: '900', color: Colors.orange },
  countdownSub: { color: Colors.textSub, fontSize: 16 },
  // finished
  finishedEmoji: { fontSize: 64 },
  finishedTitle: { fontSize: 36, fontWeight: '900', color: Colors.text },
  finishedSub: { color: Colors.textSub, fontSize: 16 },
  doneBtn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 50,
    marginTop: 8,
  },
  doneBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
});
