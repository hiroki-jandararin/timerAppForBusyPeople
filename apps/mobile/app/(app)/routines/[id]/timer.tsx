import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { routineApiClient, workoutHistoryApiClient } from '@timeapp/api-client';
import type { Routine } from '@timeapp/core';
import {
  announceForTransition,
  buildGroups,
  calculateRemainingRoutineDuration,
  calculateTotalDuration,
  createRestShorteningPlan,
  getExerciseGroupRange,
  initialTimerState,
  moveGroup,
  timerReducer,
  type ExerciseGroup,
  type TimerAction,
} from '@timeapp/core';
import { ExpoSpeechVoiceService } from '@/features/voice/expoSpeechVoiceService';
import { ExpoKeepAwakeService } from '@/features/wakeLock/expoKeepAwakeService';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';

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

function formatEndTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatScheduleDifference(seconds: number): string {
  if (seconds === 0) return '予定通り';
  const abs = Math.abs(seconds);
  const min = Math.floor(abs / 60);
  const sec = abs % 60;
  const label = min > 0 && sec > 0 ? `${min}分${sec}秒` : min > 0 ? `${min}分` : `${sec}秒`;
  return seconds > 0 ? `${label}遅れ` : `${label}早い`;
}

function PrevIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={3.5} height={16} rx={1.5} fill={Colors.textSub} />
      <Polygon points="20,4 20,20 9,12" fill={Colors.textSub} />
    </Svg>
  );
}

function PlayIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Polygon points="6,3 6,21 20,12" fill={color} />
    </Svg>
  );
}

function PauseIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Rect x={4} y={3} width={5} height={18} rx={2.5} fill={color} />
      <Rect x={15} y={3} width={5} height={18} rx={2.5} fill={color} />
    </Svg>
  );
}

function NextIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Polygon points="4,4 4,20 15,12" fill={Colors.textSub} />
      <Rect x={17.5} y={4} width={3.5} height={16} rx={1.5} fill={Colors.textSub} />
    </Svg>
  );
}

export default function TimerScreen() {
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [state, rawDispatch] = useReducer(timerReducer, initialTimerState);
  const [plannedEndAtMs, setPlannedEndAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [hasShownAdjustment, setHasShownAdjustment] = useState(false);
  const plannedStartAtMs = useRef<number | null>(null);
  const startedAtMsRef = useRef<number | null>(null);
  const wasManualFinishRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const stateRef = useRef(state);
  const voiceService = useRef(new ExpoSpeechVoiceService()).current;
  const wakeLockService = useRef(new ExpoKeepAwakeService()).current;

  const api = routineApiClient({ baseUrl: API_BASE_URL, getToken: () => token });
  const historyApi = workoutHistoryApiClient({ baseUrl: API_BASE_URL, getToken: () => token });

  function dispatch(action: TimerAction) {
    const r = activeRoutine ?? routine;
    if (!r) {
      rawDispatch(action);
      return;
    }
    const previous = stateRef.current;
    const next = timerReducer(previous, action);
    if (previous.status === 'idle' && next.status === 'countdown') {
      const start = Date.now() + 3 * 1000;
      plannedStartAtMs.current = start;
      startedAtMsRef.current = start;
      setPlannedEndAtMs(start + calculateTotalDuration(r) * 1000);
      setHasShownAdjustment(false);
      setIsAdjustmentOpen(false);
    }
    if (action.type === 'finish') {
      wasManualFinishRef.current = true;
    }
    if (next.status === 'idle') {
      startedAtMsRef.current = null;
      wasManualFinishRef.current = false;
    }
    if (next.status === 'idle' || next.status === 'finished') {
      plannedStartAtMs.current = null;
      setPlannedEndAtMs(null);
      setIsAdjustmentOpen(false);
      setHasShownAdjustment(false);
    }
    announceForTransition(previous, next, r, voiceService);
    rawDispatch(action);
  }

  function handleDefer() {
    const r = activeRoutine;
    if (!r) return;
    const cur = stateRef.current;
    if (r.items[cur.currentIndex]?.type !== 'workout') return;
    const { end } = getExerciseGroupRange(r.items, cur.currentIndex);
    setActiveRoutine(moveGroup(r, cur.currentIndex, end, r.items.length, true));
  }

  function applyRestShortening() {
    if (!activeRoutine || !plannedEndAtMs) return;
    const projectedEnd =
      nowMs +
      calculateRemainingRoutineDuration(activeRoutine, state.currentIndex, state.remainingSec) *
        1000;
    const deltaSec = Math.round((projectedEnd - plannedEndAtMs) / 1000);
    const plan = createRestShorteningPlan(activeRoutine, state.currentIndex, Math.max(0, deltaSec));
    if (plan.recoveredSec > 0) setActiveRoutine(plan.routine);
    setIsAdjustmentOpen(false);
  }

  function handleDoNext(groupStart: number) {
    const r = activeRoutine;
    if (!r) return;
    const cur = stateRef.current;
    const { end: currentEnd } = getExerciseGroupRange(r.items, cur.currentIndex);
    const { end: targetEnd } = getExerciseGroupRange(r.items, groupStart);
    setActiveRoutine(moveGroup(r, groupStart, targetEnd, currentEnd + 1, false));
  }

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state.status === 'running' || state.status === 'countdown') {
      void wakeLockService.request();
    } else {
      void wakeLockService.release();
    }
    return () => {
      void wakeLockService.release();
    };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'paused') return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (hasShownAdjustment || !activeRoutine || !plannedStartAtMs.current || !plannedEndAtMs)
      return;
    if (state.status !== 'running' && state.status !== 'paused') return;
    const projectedEnd =
      nowMs +
      calculateRemainingRoutineDuration(activeRoutine, state.currentIndex, state.remainingSec) *
        1000;
    const deltaSec = Math.round((projectedEnd - plannedEndAtMs) / 1000);
    if (deltaSec < 30) return;
    const plan = createRestShorteningPlan(activeRoutine, state.currentIndex, deltaSec);
    if (plan.recoveredSec <= 0) return;
    setIsAdjustmentOpen(true);
    setHasShownAdjustment(true);
  }, [nowMs, hasShownAdjustment, activeRoutine, plannedEndAtMs, state]);

  useEffect(() => {
    api.getById(id).then((r) => {
      setRoutine(r);
      setActiveRoutine(r);
    });
  }, [id]);

  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'countdown') return;
    const interval = setInterval(() => {
      const r = activeRoutine ?? routine;
      if (r) dispatch({ type: 'tick', routine: r });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.status, activeRoutine, routine]);

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

  useEffect(() => {
    if (state.status !== 'finished' || !startedAtMsRef.current) return;
    const r = activeRoutine ?? routine;
    if (!r) return;
    const isManual = wasManualFinishRef.current;
    const startedAt = startedAtMsRef.current;
    startedAtMsRef.current = null;
    wasManualFinishRef.current = false;
    void historyApi.create({
      id: `hist_${'xxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))}_${Date.now()}`,
      routineId: r.id,
      routineName: r.name,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      completed: !isManual,
      itemsCount: r.items.length,
      itemsCompleted: isManual ? state.currentIndex : r.items.length,
    });
  }, [state.status]);

  if (!routine) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  const ar = activeRoutine ?? routine;
  const currentItem = ar.items[state.currentIndex];
  const isInterval = currentItem?.type === 'interval';

  const projectedEnd = plannedEndAtMs
    ? nowMs + calculateRemainingRoutineDuration(ar, state.currentIndex, state.remainingSec) * 1000
    : null;
  const deltaSec =
    plannedEndAtMs && projectedEnd !== null
      ? Math.round((projectedEnd - plannedEndAtMs) / 1000)
      : 0;
  const endTimeLabel = plannedEndAtMs ? formatEndTime(plannedEndAtMs) : '';
  const accentColor = isInterval ? Colors.green : Colors.orange;
  const send = (action: TimerAction) => dispatch(action);
  const groups = buildGroups(ar.items, state.currentIndex, state.status === 'finished');
  const currentIsWorkout = currentItem?.type === 'workout';

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
      <View style={[styles.idleContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.center}>
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

  const overallProgress = ar.items.length > 0 ? (state.currentIndex / ar.items.length) * 100 : 0;

  const isWarning = state.remainingSec > 0 && state.remainingSec <= 3;
  const ringColor = isWarning ? Colors.yellow : accentColor;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.routineNameSmall} numberOfLines={1}>
            {routine.name}
          </Text>
          <Text style={styles.indexInfo}>
            {state.currentIndex + 1} / {ar.items.length}
          </Text>
        </View>
        {endTimeLabel ? (
          <View style={styles.headerBottom}>
            <Text style={styles.endTimeLabel}>終了予定 {endTimeLabel}</Text>
            {deltaSec > 0 ? (
              <Text style={styles.delayLabel}>{formatScheduleDifference(deltaSec)}</Text>
            ) : null}
          </View>
        ) : null}
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
                {isInterval ? 'インターバル' : 'ワークアウト'}
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

        <Text style={styles.nextLabel} numberOfLines={1}>
          {ar.items[state.currentIndex + 1] ? (
            <>
              <Text style={styles.nextLabelPrefix}>次▸ </Text>
              {ar.items[state.currentIndex + 1].title}
            </>
          ) : ' '}
        </Text>

        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.6 }]}
            onPress={() => send({ type: 'previous', routine: ar })}
          >
            <PrevIcon />
          </Pressable>

          <Pressable
            testID="play-pause-btn"
            style={({ pressed }) => [
              styles.playBtn,
              { backgroundColor: accentColor },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => send(state.status === 'paused' ? { type: 'resume' } : { type: 'pause' })}
          >
            {state.status === 'paused' ? (
              <PlayIcon color={Colors.bg} />
            ) : (
              <PauseIcon color={Colors.bg} />
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.6 }]}
            onPress={() => send({ type: 'skip', routine: ar })}
          >
            <NextIcon />
          </Pressable>
        </View>

        {/* 短縮提案ダイアログ */}
        {isAdjustmentOpen && (
          <View style={styles.adjustmentCard}>
            <Text style={styles.adjustmentTitle}>インターバルを短縮しますか？</Text>
            <Text style={styles.adjustmentSub}>この先のインターバルをまとめて短縮できます。</Text>
            <View style={styles.adjustmentBtns}>
              <Pressable onPress={applyRestShortening} style={styles.adjustmentBtnPrimary}>
                <Text style={styles.adjustmentBtnPrimaryText}>短縮する</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsAdjustmentOpen(false)}
                style={styles.adjustmentBtnSecondary}
              >
                <Text style={styles.adjustmentBtnSecondaryText}>スキップ</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* QUEUE */}
        <View style={styles.queue}>
          <Text style={styles.queueLabel}>QUEUE</Text>
          {groups.map((group: ExerciseGroup) => (
            <View
              key={group.itemStart}
              testID={`queue-item-${group.itemStart}`}
              style={[
                styles.queueItem,
                group.status === 'current' && styles.queueItemCurrent,
                group.status === 'done' && styles.queueItemDone,
              ]}
            >
              <Text
                style={[
                  styles.queueItemTitle,
                  group.status === 'done' && styles.queueItemTitleDone,
                ]}
              >
                {group.baseTitle}
                {group.setCount > 1 ? ` × ${group.setCount}` : ''}
              </Text>
              {group.status === 'current' && currentIsWorkout && (
                <Pressable onPress={handleDefer} style={styles.queueBtn}>
                  <Text style={styles.queueBtnText}>後回し</Text>
                </Pressable>
              )}
              {group.status === 'upcoming' && (
                <Pressable onPress={() => handleDoNext(group.itemStart)} style={styles.queueBtn}>
                  <Text style={styles.queueBtnText}>次にやる</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.finishBtn, pressed && { opacity: 0.7 }]}
          onPress={() => send({ type: 'finish' })}
        >
          <Text style={styles.finishBtnText}>終了する</Text>
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
  idleContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    gap: 16,
  },
  header: { gap: 6, marginBottom: 12 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: { paddingRight: 10, justifyContent: 'center' },
  backIcon: { color: Colors.textSub, fontSize: 28, lineHeight: 32, marginTop: -2 },
  routineNameSmall: {
    color: Colors.textSub,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  indexInfo: { color: Colors.textMuted, fontSize: 14 },
  endTimeLabel: { color: Colors.textMuted, fontSize: 13 },
  delayLabel: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  mainArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
    color: Colors.textSub,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  nextLabelPrefix: {
    color: Colors.orange,
    fontWeight: '800',
  },
  bottomArea: {
    gap: 12,
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
  finishBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF444466',
  },
  finishBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
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
  // adjustment
  adjustmentCard: {
    backgroundColor: '#2C2C30',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.orange + '60',
  },
  adjustmentTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  adjustmentSub: { color: Colors.textSub, fontSize: 12 },
  adjustmentBtns: { flexDirection: 'row', gap: 8 },
  adjustmentBtnPrimary: {
    flex: 1,
    backgroundColor: Colors.orange,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  adjustmentBtnPrimaryText: { color: Colors.bg, fontSize: 13, fontWeight: '800' },
  adjustmentBtnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3C3C42',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  adjustmentBtnSecondaryText: { color: Colors.textMuted, fontSize: 13 },
  // queue
  queue: { gap: 4 },
  queueLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF08',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3C3C42',
  },
  queueItemCurrent: { backgroundColor: '#FF6B3512', borderColor: '#FF6B3535' },
  queueItemDone: { opacity: 0.4 },
  queueItemTitle: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: '700' },
  queueItemTitleDone: { color: Colors.textMuted },
  queueBtn: {
    backgroundColor: Colors.orange,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  queueBtnText: { color: Colors.bg, fontSize: 11, fontWeight: '800' },
});
