import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { routineApiClient, workoutHistoryApiClient, ApiError } from '@timeapp/api-client';
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
import { SilentAudioService } from '@/features/backgroundTimer/silentAudioService';
import { reorderUpcoming } from '@/features/timer/reorderUpcoming';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

const QUEUE_ITEM_H = 40; // paddingVertical:8*2 + text高さ
const QUEUE_GAP = 4;

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

// ─── QueueList ────────────────────────────────────────────────────────────────
// Animated.Valueで各スロットのtopを管理し、ドラッグをスムーズにアニメーションする。

const SPRING_CFG = { tension: 300, friction: 30, useNativeDriver: false } as const;

type QueueListProps = {
  groups: ExerciseGroup[];
  onDragEnd: (newGroups: ExerciseGroup[]) => void;
  onDragStart?: () => void;
  onDragFinish?: () => void;
  renderItem: (group: ExerciseGroup, drag: () => void, isActive: boolean) => React.ReactNode;
};

function QueueList({ groups, onDragEnd, onDragStart, onDragFinish, renderItem }: QueueListProps) {
  const STEP = QUEUE_ITEM_H + QUEUE_GAP;

  // スロットごとのtop位置アニメーション（インデックス順に管理）
  const animTops = useRef<Animated.Value[]>([]);
  while (animTops.current.length < groups.length) {
    animTops.current.push(new Animated.Value(animTops.current.length * STEP));
  }

  // ドラッグ中のアイテム専用アニメーション（指に直追従）
  const activeTopAnim = useRef(new Animated.Value(0)).current;

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeRef = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);
  const groupsRef = useRef(groups);
  const onDragEndRef = useRef(onDragEnd);
  const onDragStartRef = useRef(onDragStart);
  const onDragFinishRef = useRef(onDragFinish);
  const containerRef = useRef<View>(null);
  const containerTopRef = useRef(0);
  groupsRef.current = groups;
  onDragEndRef.current = onDragEnd;
  onDragStartRef.current = onDragStart;
  onDragFinishRef.current = onDragFinish;

  // グループ変更後（並び替え完了後）に全スロットを正規位置にリセット
  useEffect(() => {
    if (activeRef.current !== null) return;
    groups.forEach((_, i) => animTops.current[i]?.setValue(i * STEP));
  }, [groups]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => activeRef.current !== null,
      onPanResponderMove: (_, gs) => {
        const aIdx = activeRef.current;
        if (aIdx === null) return;

        // ドラッグアイテムを指に追従させる
        activeTopAnim.setValue(aIdx * STEP + gs.dy);

        // ホバー先スロットを計算
        const all = groupsRef.current;
        const firstUp = all.findIndex((g) => g.status === 'upcoming');
        const relY = gs.moveY - containerTopRef.current;
        const clamped = Math.max(
          firstUp >= 0 ? firstUp : 0,
          Math.min(all.length - 1, Math.floor(relY / STEP))
        );
        if (clamped === overRef.current) return;
        overRef.current = clamped;

        // 他アイテムをスプリングでスライド
        all.forEach((_, i) => {
          if (i === aIdx) return;
          const anim = animTops.current[i];
          if (!anim) return;
          let target: number;
          if (aIdx < clamped) {
            target = i > aIdx && i <= clamped ? (i - 1) * STEP : i * STEP;
          } else {
            target = i >= clamped && i < aIdx ? (i + 1) * STEP : i * STEP;
          }
          Animated.spring(anim, { toValue: target, ...SPRING_CFG }).start();
        });
      },

      onPanResponderRelease: () => {
        const from = activeRef.current;
        const to = overRef.current;
        activeRef.current = null;
        overRef.current = null;
        if (from === null) { setActiveIdx(null); return; }

        const dest = to ?? from;
        // ドロップ位置へスプリングで着地
        Animated.spring(activeTopAnim, { toValue: dest * STEP, ...SPRING_CFG }).start(() => {
          // 着地後、destinationスロットを正規位置に初期化（再レンダリング時のジャンプ防止）
          animTops.current[dest]?.setValue(dest * STEP);
          setActiveIdx(null);
          onDragFinishRef.current?.();
          if (to !== null && from !== to) {
            const next = [...groupsRef.current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            onDragEndRef.current(next);
          }
        });
      },

      onPanResponderTerminate: () => {
        const from = activeRef.current;
        activeRef.current = null;
        overRef.current = null;
        if (from === null) { setActiveIdx(null); return; }
        // キャンセル時は元の位置へスプリングで戻す
        Animated.spring(activeTopAnim, { toValue: from * STEP, ...SPRING_CFG }).start(() => {
          animTops.current[from]?.setValue(from * STEP);
          groupsRef.current.forEach((_, i) => {
            if (i !== from) Animated.spring(animTops.current[i]!, { toValue: i * STEP, ...SPRING_CFG }).start();
          });
          setActiveIdx(null);
          onDragFinishRef.current?.();
        });
      },
    })
  ).current;

  const totalH = groups.length * QUEUE_ITEM_H + Math.max(0, groups.length - 1) * QUEUE_GAP;

  return (
    <View
      ref={containerRef}
      style={{ height: totalH }}
      onLayout={() => {
        containerRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
          containerTopRef.current = pageY;
        });
      }}
      {...panResponder.panHandlers}
    >
      {groups.map((group, index) => {
        const isActive = activeIdx === index;
        return (
          <Animated.View
            key={String(group.itemStart)}
            style={[
              {
                position: 'absolute',
                top: isActive ? activeTopAnim : (animTops.current[index] ?? new Animated.Value(index * STEP)),
                left: 0,
                right: 0,
              },
              isActive ? styles.queueItemLifted : undefined,
            ]}
          >
            {renderItem(
              group,
              () => {
                activeTopAnim.setValue(index * STEP);
                activeRef.current = index;
                overRef.current = index;
                setActiveIdx(index);
                onDragStartRef.current?.();
              },
              isActive,
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TimerScreen() {
  const { token, signOut } = useAuth();
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
  const [queueView, setQueueView] = useState<'set' | 'all'>('set');
  const [isDraggingQueue, setIsDraggingQueue] = useState(false);
  const plannedStartAtMs = useRef<number | null>(null);
  const startedAtMsRef = useRef<number | null>(null);
  const wasManualFinishRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const stateRef = useRef(state);
  const voiceService = useRef(new ExpoSpeechVoiceService()).current;
  const wakeLockService = useRef(new ExpoKeepAwakeService()).current;
  const silentAudio = useRef(new SilentAudioService()).current;
  const suppressVoiceRef = useRef(false);
  const lastTickAtRef = useRef<number | null>(null);

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
      const endMs = start + calculateTotalDuration(r) * 1000;
      setPlannedEndAtMs(endMs);
      setHasShownAdjustment(false);
      setIsAdjustmentOpen(false);
      void silentAudio.start().then(() => void silentAudio.playTick());
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
      void silentAudio.stop();
    }
    if (previous.status === 'countdown' && next.status === 'countdown') {
      void silentAudio.playTick();
    }
    if (previous.status === 'countdown' && next.status === 'running') {
      void silentAudio.playBeep();
    }
    if (
      next.status === 'running' &&
      previous.currentIndex !== next.currentIndex
    ) {
      void silentAudio.playBeep();
    }
    if (previous.status !== 'finished' && next.status === 'finished') {
      void silentAudio.playBeep();
    }
    if (!suppressVoiceRef.current) {
      if (action.type === 'skip' || action.type === 'previous') {
        voiceService.stop();
      }
      announceForTransition(previous, next, r, voiceService);
    }
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

  function handleQueueReorder(newGroups: ExerciseGroup[]) {
    const r = activeRoutine;
    if (!r) return;
    const cur = stateRef.current;
    const currentGroup = newGroups.find((g) => g.status === 'current');
    // currentGroupがない（インターバル中など）はgetExerciseGroupRangeで算出し、
    // trailing intervalも含めるよう+1する
    let currentGroupEnd: number;
    if (currentGroup) {
      currentGroupEnd = currentGroup.itemEnd;
    } else {
      const { end } = getExerciseGroupRange(r.items, cur.currentIndex);
      currentGroupEnd =
        end + 1 < r.items.length && r.items[end + 1]?.type === 'interval' ? end + 1 : end;
    }
    const upcomingGroups = newGroups.filter((g) => g.status === 'upcoming');
    setActiveRoutine(reorderUpcoming(r, currentGroupEnd, upcomingGroups));
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
    }).catch((e) => {
      if (e instanceof ApiError && e.status === 401) signOut();
      else router.back();
    });
  }, [id]);

  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'countdown') return;
    const interval = setInterval(() => {
      lastTickAtRef.current = Date.now();
      const r = activeRoutine ?? routine;
      if (r) dispatch({ type: 'tick', routine: r });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.status, activeRoutine, routine]);

  // 前台復帰時にバックグラウンド中の経過分を補完
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active') return;
      if (stateRef.current.status !== 'running') return;
      if (!lastTickAtRef.current) return;
      const elapsed = Math.floor((Date.now() - lastTickAtRef.current) / 1000);
      if (elapsed < 2) return;
      const r = activeRoutine ?? routine;
      if (!r) return;
      suppressVoiceRef.current = true;
      for (let i = 0; i < elapsed - 1; i++) {
        dispatch({ type: 'tick', routine: r });
      }
      suppressVoiceRef.current = false;
    });
    return () => sub.remove();
  }, [activeRoutine, routine]);

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

      {/* 下部: コントロール＋終了 */}
      <View style={styles.bottomArea}>
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
          <View style={styles.queueHeader}>
            <Text style={styles.queueLabel}>QUEUE</Text>
            <View style={styles.queueToggle}>
              <Pressable
                onPress={() => setQueueView('set')}
                style={[styles.toggleBtn, queueView === 'set' && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleBtnText, queueView === 'set' && styles.toggleBtnTextActive]}>セット</Text>
              </Pressable>
              <Pressable
                onPress={() => setQueueView('all')}
                style={[styles.toggleBtn, queueView === 'all' && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleBtnText, queueView === 'all' && styles.toggleBtnTextActive]}>全表示</Text>
              </Pressable>
            </View>
          </View>
          {queueView === 'set' ? (
            <ScrollView
              style={styles.queueScroll}
              scrollEnabled={!isDraggingQueue}
              showsVerticalScrollIndicator={false}
            >
            <QueueList
              groups={groups}
              onDragEnd={handleQueueReorder}
              onDragStart={() => setIsDraggingQueue(true)}
              onDragFinish={() => setIsDraggingQueue(false)}
              renderItem={(group, drag, isActive) => (
                <Pressable
                  testID={`queue-item-${group.itemStart}`}
                  onLongPress={group.status === 'upcoming' ? drag : undefined}
                  delayLongPress={150}
                  style={[
                    styles.queueItem,
                    { height: QUEUE_ITEM_H },
                    group.status === 'current' && styles.queueItemCurrent,
                    group.status === 'done' && styles.queueItemDone,
                    isActive && styles.queueItemDragging,
                  ]}
                >
                  <Text
                    style={[
                      styles.queueItemTitle,
                      group.status === 'done' && styles.queueItemTitleDone,
                    ]}
                    numberOfLines={1}
                  >
                    {group.baseTitle}
                    {group.setCount > 1 ? ` × ${group.setCount}` : ''}
                  </Text>
                  {group.status === 'current' && currentIsWorkout && (
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          '後回しにしますか？',
                          'この種目をキューの末尾に移動します。',
                          [
                            { text: 'キャンセル', style: 'cancel' },
                            { text: '後回し', style: 'destructive', onPress: handleDefer },
                          ],
                        )
                      }
                      style={styles.deferBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.deferBtnText}>後回し</Text>
                    </Pressable>
                  )}
                  {group.status === 'upcoming' && (
                    <Text style={styles.dragHandle}>⠿</Text>
                  )}
                </Pressable>
              )}
            />
            </ScrollView>
          ) : (
            <ScrollView style={styles.queueScroll} showsVerticalScrollIndicator={false}>
              {ar.items.map((item, index) => {
                const isDone = index < state.currentIndex;
                const isCurrent = index === state.currentIndex;
                if (item.type === 'interval') {
                  return (
                    <View key={item.id} style={[styles.allViewRest, isDone && { opacity: 0.3 }]}>
                      <View style={styles.allViewRestLine} />
                      <Text style={styles.allViewRestText}>休憩</Text>
                      <Text style={styles.allViewRestDuration}>{formatTime(item.durationSec)}</Text>
                      <View style={styles.allViewRestLine} />
                    </View>
                  );
                }
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.queueItem,
                      { height: QUEUE_ITEM_H, marginBottom: 2 },
                      isCurrent && styles.queueItemCurrent,
                      isDone && styles.queueItemDone,
                    ]}
                  >
                    <Text
                      style={[styles.queueItemTitle, isDone && styles.queueItemTitleDone]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.allViewDuration, isDone && styles.queueItemTitleDone]}>
                      {formatTime(item.durationSec)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
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
    paddingBottom: 24,
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
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  queueLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  queueToggle: { flexDirection: 'row', gap: 4 },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3C3C42',
  },
  toggleBtnActive: { backgroundColor: '#FF6B3520', borderColor: '#FF6B3560' },
  toggleBtnText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  toggleBtnTextActive: { color: Colors.orange },
  queueItemTitleInterval: { color: Colors.textSub },
  queueScroll: { height: 180 },
  // 全表示モード
  allViewRest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    height: 28,
    marginBottom: 2,
  },
  allViewRestLine: { flex: 1, height: 1, backgroundColor: '#3C3C42' },
  allViewRestText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  allViewRestDuration: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  allViewDuration: {
    color: Colors.textSub,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
    paddingLeft: 8,
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
  queueItemDragging: { backgroundColor: '#FF6B3525', borderColor: Colors.orange },
  queueItemLifted: {
    opacity: 0.85,
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  dragHandle: { color: Colors.textMuted, fontSize: 18, paddingLeft: 8 },
  deferBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  deferBtnText: { color: Colors.textSub, fontSize: 11, fontWeight: '700' },
});
