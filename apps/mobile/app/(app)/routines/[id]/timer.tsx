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
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

const RING_RADIUS = 45;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const STROKE_WIDTH = 8;
const VIEWBOX = 100;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'countdown') return;
    const interval = setInterval(() => {
      if (routine) dispatch({ type: 'tick', routine });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.status, routine]);

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

  if (state.status === 'idle') {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <Text style={styles.routineName}>{routine.name}</Text>
        <Text style={styles.routineMeta}>{routine.items.length}種目</Text>
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

  if (state.status === 'countdown') {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <Text style={styles.countdownText}>{state.remainingSec}</Text>
        <Text style={styles.countdownSub}>準備してください</Text>
      </View>
    );
  }

  // 実行中 / 一時停止中
  const dashOffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  const overallProgress =
    routine.items.length > 0 ? (state.currentIndex / routine.items.length) * 100 : 0;

  const isWarning = state.remainingSec > 0 && state.remainingSec <= 3;
  const ringColor = isWarning ? Colors.yellow : accentColor;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.topInfo}>
        <Text style={styles.routineNameSmall}>{routine.name}</Text>
        <Text style={styles.indexInfo}>
          {state.currentIndex + 1} / {routine.items.length}
        </Text>
      </View>

      {/* 中央: リング＋アイテム名＋次の種目 */}
      <View style={styles.mainArea}>
        <View style={styles.ringWrapper}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id="workGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FF6B35" />
                <Stop offset="100%" stopColor="#FFA94D" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={VIEWBOX / 2}
              cy={VIEWBOX / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={Colors.cardBorder}
              strokeWidth={STROKE_WIDTH}
            />
            <AnimatedCircle
              cx={VIEWBOX / 2}
              cy={VIEWBOX / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={isWarning || isInterval ? ringColor : 'url(#workGradient)'}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90, ${VIEWBOX / 2}, ${VIEWBOX / 2})`}
            />
          </Svg>

          <View style={styles.ringInner}>
            <View style={[styles.itemTypeBadge, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.itemTypeText, { color: accentColor }]}>
                {isInterval ? '休憩' : '種目'}
              </Text>
            </View>
            <Text style={[styles.timerDisplay, { color: isWarning ? Colors.yellow : accentColor }]}>
              {formatTime(state.remainingSec)}
            </Text>
          </View>
        </View>

        <Text style={styles.itemTitle} numberOfLines={2}>
          {currentItem?.title ?? ''}
        </Text>

        <Text style={styles.nextLabel}>
          {routine.items[state.currentIndex + 1]
            ? `次: ${routine.items[state.currentIndex + 1].title}`
            : ' '}
        </Text>
      </View>

      {/* 下部: 全体進捗＋コントロール＋終了 */}
      <View style={styles.bottomArea}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${overallProgress}%`, backgroundColor: Colors.orange },
            ]}
          />
        </View>

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    gap: 16,
  },
  topInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routineNameSmall: { color: Colors.textSub, fontSize: 14, fontWeight: '600' },
  indexInfo: { color: Colors.textMuted, fontSize: 14 },
  mainArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  ringWrapper: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  itemTypeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  itemTypeText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  timerDisplay: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 2,
  },
  itemTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 30,
  },
  nextLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  bottomArea: {
    gap: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
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
  finishLink: { alignItems: 'center' },
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
