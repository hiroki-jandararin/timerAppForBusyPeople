import { Colors } from '@/constants/colors';
import type { CreateRoutineInput } from '@timeapp/api-client';
import { addWorkoutSet, addPairedWorkoutSet, buildGroups, MUSCLE_GROUPS, type Routine, type RoutineItem } from '@timeapp/core';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

type Props = {
  title: string;
  initialValues?: Routine;
  onSubmit: (input: CreateRoutineInput) => Promise<void>;
  generateAiRoutine?: (prompt: string, targetDurationSec?: number) => Promise<Routine>;
};

const DURATION_PRESETS = [15, 20, 30, 45, 60, 90, 120];
const AI_BODY_PARTS = ['胸', '背中', '肩', '腕（前）', '腕（後ろ）', '足（前）', '足（後ろ）', '腹筋', '背筋', 'ふくらはぎ'] as const;
const AI_DURATION_PRESETS = [10, 15, 20, 30, 45, 60] as const;

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function emptyItem(): RoutineItem {
  return { id: genId(), type: 'workout', title: '', durationSec: 30, voiceText: '' };
}

function emptyInterval(): RoutineItem {
  return { id: genId(), type: 'interval', title: '', durationSec: 30, voiceText: '' };
}

function fmtDuration(sec: number): string {
  return sec < 60 ? `${sec}秒` : `${sec / 60}分`;
}

function TotalDurationBar({ items, targetDurationSec }: { items: RoutineItem[]; targetDurationSec: number | null }) {
  const total = items.reduce((s, i) => s + i.durationSec, 0);
  const diff = targetDurationSec != null ? total - targetDurationSec : null;
  const diffAbs = diff != null ? Math.abs(diff) : 0;
  const diffLabel = diff != null
    ? diff > 0
      ? `目標より ${diff}秒 オーバー`
      : diff < 0
        ? `目標まで あと ${diffAbs}秒`
        : '目標時間にぴったり'
    : null;
  return (
    <View style={{ backgroundColor: '#1A1A1E', borderRadius: 10, padding: 10, marginTop: 6, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1 }}>アイテム合計時間</Text>
        <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '700' }}>{fmtDuration(total)}</Text>
      </View>
      {diffLabel != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1 }}>目標との差分</Text>
          <Text style={{ color: diff === 0 ? '#22c55e' : diff! > 0 ? '#EF4444' : '#facc15', fontSize: 13, fontWeight: '600' }}>
            {diffLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function RoutineForm({ title, initialValues, onSubmit, generateAiRoutine }: Props) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [items, setItems] = useState<RoutineItem[]>(
    initialValues?.items.length ? initialValues.items : [emptyItem()],
  );
  const [targetDurationText, setTargetDurationText] = useState(
    initialValues?.targetDurationSec ? String(Math.floor(initialValues.targetDurationSec / 60)) : ''
  );
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'set'>('all');
  const [nameError, setNameError] = useState('');
  const [itemsError, setItemsError] = useState('');
  const [targetDurationError, setTargetDurationError] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [setFormOpen, setSetFormOpen] = useState(false);
  const [isPairedMode, setIsPairedMode] = useState(false);
  const [includeLastInterval, setIncludeLastInterval] = useState(false);
  const [setTitle, setSetTitle] = useState('');
  const [setCount, setSetCount] = useState('3');
  const [workoutSec, setWorkoutSec] = useState('60');
  const [intervalSec, setIntervalSec] = useState('90');
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [pickerReps, setPickerReps] = useState('');
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiParts, setAiParts] = useState<string[]>([]);
  const [aiMinutes, setAiMinutes] = useState<number | null>(null);
  const [aiExtra, setAiExtra] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAddWorkoutSet = () => {
    const draftRoutine = { id: '', name, items, createdAt: '', updatedAt: '' };
    const input = {
      title: setTitle.trim() || 'ワークアウト',
      workoutDurationSec: Number(workoutSec) || 60,
      intervalDurationSec: Number(intervalSec) || 90,
      setCount: Number(setCount) || 3,
      includeLastInterval,
    };
    const updated = isPairedMode
      ? addPairedWorkoutSet(draftRoutine, input)
      : addWorkoutSet(draftRoutine, input);
    const existingIds = new Set(items.map((i) => i.id));
    const newIds = updated.items.filter((i) => !existingIds.has(i.id)).map((i) => i.id);
    setExpandedItemIds((prev) => new Set([...prev, ...newIds]));
    setItems(updated.items);
    setSetTitle('');
    setSetFormOpen(false);
  };

  const handleAiGenerate = async () => {
    if (!generateAiRoutine || !aiParts.length || !aiMinutes) return;
    const prompt = `${aiParts.join('・')}を${aiMinutes}分で鍛えたい。${aiExtra.trim()}`;
    setIsAiLoading(true);
    try {
      const generated = await generateAiRoutine(prompt, aiMinutes * 60);
      setExpandedItemIds((prev) => new Set([...prev, ...generated.items.map((i) => i.id)]));
      setItems((prev) => [...prev, ...generated.items]);
      setIsAiPanelOpen(false);
      setAiParts([]);
      setAiMinutes(null);
      setAiExtra('');
    } catch {
      Alert.alert('エラー', '生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsAiLoading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<RoutineItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      Alert.alert('', '最低1つのアイテムが必要です');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const duplicateItem = (index: number) => {
    setItems((prev) => {
      const copy = { ...prev[index], id: genId() };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const targetDurationSec = (() => {
    const m = parseInt(targetDurationText, 10);
    return !isNaN(m) && m > 0 ? m * 60 : null;
  })();

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError('ルーティン名を入力してください');
      return;
    }
    setNameError('');
    if (!targetDurationSec) {
      setTargetDurationError('目標時間を設定してください');
      return;
    }
    setTargetDurationError('');
    const invalid = items.find((item) => !item.title.trim());
    if (invalid) {
      setItemsError('全アイテムのタイトルを入力してください');
      return;
    }
    setItemsError('');
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), items, targetDurationSec });
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<RoutineItem>) => {
    const index = items.findIndex((i) => i.id === item.id);
    const isExpanded = expandedItemIds.has(item.id);
    const durationLabel = item.durationSec < 60 ? `${item.durationSec}秒` : `${item.durationSec / 60}分`;
    const renderDeleteAction = (progress: Animated.AnimatedInterpolation<number>) => {
      const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1], extrapolate: 'clamp' });
      return (
        <Pressable style={styles.swipeDeleteAction} onPress={() => removeItem(index)}>
          <Animated.Text style={[styles.swipeDeleteText, { transform: [{ scale }] }]}>削除</Animated.Text>
        </Pressable>
      );
    };

    return (
      <ScaleDecorator>
        <Swipeable renderRightActions={renderDeleteAction} friction={2} rightThreshold={60}>
          <View style={[styles.itemCard, isActive && { opacity: 0.9 }]}>
            <View style={styles.itemHeader}>
              <Pressable style={styles.itemSummary} onPress={() => toggleExpand(item.id)} onLongPress={drag} delayLongPress={150}>
                <View style={[
                  styles.typeDot,
                  { backgroundColor: item.type === 'workout' ? Colors.orange : Colors.green },
                ]} />
                <Text style={styles.itemSummaryTitle} numberOfLines={1}>
                  {item.title || 'アイテム名未設定'}
                </Text>
                <View style={styles.durationBadge}>
                  <Text style={styles.durationBadgeText}>{durationLabel}</Text>
                </View>
              </Pressable>
              <View testID="drag-handle" />
            </View>

          {isExpanded && (
            <>
              <View style={styles.typeToggle}>
                {(['workout', 'interval'] as const).map((t) => (
                  <Pressable
                    key={t}
                    style={[
                      styles.typeBtn,
                      item.type === t && {
                        backgroundColor: t === 'workout' ? Colors.orange : Colors.green,
                      },
                    ]}
                    onPress={() => updateItem(index, { type: t })}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        item.type === t && { color: Colors.bg, fontWeight: '700' },
                      ]}
                    >
                      {t === 'workout' ? 'ワークアウト' : 'インターバル'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="アイテム名"
                placeholderTextColor={Colors.textMuted}
                value={item.title}
                onChangeText={(v) => updateItem(index, { title: v })}
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>時間</Text>
              <View style={styles.presetRow}>
                {DURATION_PRESETS.map((sec) => (
                  <Pressable
                    key={sec}
                    style={[
                      styles.presetBtn,
                      item.durationSec === sec && styles.presetBtnActive,
                    ]}
                    onPress={() => updateItem(index, { durationSec: sec })}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        item.durationSec === sec && styles.presetTextActive,
                      ]}
                    >
                      {sec < 60 ? `${sec}秒` : `${sec / 60}分`}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.duplicateBtn} onPress={() => duplicateItem(index)}>
                <Text style={styles.duplicateBtnText}>このアイテムを複製</Text>
              </Pressable>
            </>
          )}
          </View>
        </Swipeable>
      </ScaleDecorator>
    );
  };

  const exerciseGroups = buildGroups(items, -1, false);
  const groupedItemIndices = new Set(exerciseGroups.flatMap((g) => Array.from({ length: g.itemEnd - g.itemStart + 1 }, (_, i) => g.itemStart + i)));

  const renderSetGroup = (startIdx: number) => {
    const group = exerciseGroups.find((g) => g.itemStart === startIdx);
    if (!group) return null;
    const groupItems = items.slice(group.itemStart, group.itemEnd + 1);
    const workouts = groupItems.filter((i) => i.type === 'workout');
    const totalSec = group.totalSec;
    const totalLabel = totalSec < 60 ? `${totalSec}秒` : `${Math.floor(totalSec / 60)}分${totalSec % 60 > 0 ? `${totalSec % 60}秒` : ''}`;

    return (
      <View style={styles.setGroupCard}>
        <View style={styles.setGroupHeader}>
          <View style={styles.setGroupLeft}>
            <View style={[styles.typeDot, { backgroundColor: Colors.orange }]} />
            <Text style={styles.setGroupTitle} numberOfLines={1}>{group.baseTitle}</Text>
          </View>
          <View style={styles.setGroupMeta}>
            <Text style={styles.setGroupCount}>{group.setCount}セット</Text>
            {group.restSec > 0 && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>休憩 {group.restSec}秒</Text>
              </View>
            )}
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>{totalLabel}</Text>
            </View>
          </View>
        </View>
        <View style={styles.setGroupItems}>
          {workouts.map((w, i) => (
            <Text key={w.id} style={styles.setGroupItemText}>
              {i + 1}. {w.title}　{w.durationSec < 60 ? `${w.durationSec}秒` : `${w.durationSec / 60}分`}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <DraggableFlatList
        data={viewMode === 'set'
          ? items.filter((_, idx) => !groupedItemIndices.has(idx) || exerciseGroups.some((g) => g.itemStart === idx))
          : items
        }
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => {
          if (viewMode === 'set') return;
          setItems(data);
        }}
        renderItem={(params) => {
          if (viewMode === 'set') {
            const idx = items.findIndex((i) => i.id === params.item.id);
            const group = exerciseGroups.find((g) => g.itemStart === idx);
            if (group) {
              return (
                <ScaleDecorator key={params.item.id}>
                  {renderSetGroup(idx)}
                </ScaleDecorator>
              );
            }
          }
          return renderItem(params);
        }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            <Text style={styles.sectionLabel}>ルーティン名</Text>
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="例: 朝トレ10分"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              returnKeyType="done"
            />

            <Text style={styles.sectionLabel}>目標時間（任意）</Text>
            <TextInput
              style={styles.input}
              placeholder="目標時間（分）"
              placeholderTextColor={Colors.textMuted}
              value={targetDurationText}
              onChangeText={(v) => { setTargetDurationText(v); setTargetDurationError(''); }}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <TotalDurationBar items={items} targetDurationSec={targetDurationSec} />
            {targetDurationError ? <Text style={styles.errorText}>{targetDurationError}</Text> : null}

            {itemsError ? <Text style={styles.errorText}>{itemsError}</Text> : null}
            <View style={styles.itemsHeader}>
              <Text style={styles.sectionLabel}>アイテム</Text>
              <View style={styles.viewToggle}>
                <Pressable
                  style={[styles.viewToggleBtn, viewMode === 'all' && styles.viewToggleBtnActive]}
                  onPress={() => setViewMode('all')}
                >
                  <Text style={[styles.viewToggleText, viewMode === 'all' && styles.viewToggleTextActive]}>全表示</Text>
                </Pressable>
                <Pressable
                  style={[styles.viewToggleBtn, viewMode === 'set' && styles.viewToggleBtnActive]}
                  onPress={() => setViewMode('set')}
                >
                  <Text style={[styles.viewToggleText, viewMode === 'set' && styles.viewToggleTextActive]}>セット</Text>
                </Pressable>
              </View>
            </View>
          </>
        }
        ListFooterComponent={
          <>
            <Pressable style={styles.addItemBtn} onPress={() => setItems((prev) => [...prev, emptyItem()])}>
              <Text style={styles.addItemText}>＋ アイテムを追加</Text>
            </Pressable>

            <Pressable style={styles.addItemBtn} onPress={() => setItems((prev) => [...prev, emptyInterval()])}>
              <Text style={styles.addItemText}>＋ インターバルを追加</Text>
            </Pressable>

            <Pressable style={styles.addItemBtn} onPress={() => setSetFormOpen((v) => !v)}>
              <Text style={styles.addItemText}>セットを追加</Text>
            </Pressable>

            {setFormOpen && (
              <View style={styles.setForm}>
                <TextInput
                  style={styles.input}
                  placeholder="種目名"
                  placeholderTextColor={Colors.textMuted}
                  value={setTitle}
                  onChangeText={setSetTitle}
                  returnKeyType="done"
                />
                <View style={styles.setFormRow}>
                  <View style={styles.setFormField}>
                    <Text style={styles.fieldLabel}>ワークアウト時間(秒)</Text>
                    <TextInput
                      style={styles.input}
                      value={workoutSec}
                      onChangeText={setWorkoutSec}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                  </View>
                  <View style={styles.setFormField}>
                    <Text style={styles.fieldLabel}>インターバル時間(秒)</Text>
                    <TextInput
                      style={styles.input}
                      value={intervalSec}
                      onChangeText={setIntervalSec}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                  </View>
                  <View style={styles.setFormField}>
                    <Text style={styles.fieldLabel}>セット数</Text>
                    <TextInput
                      style={styles.input}
                      value={setCount}
                      onChangeText={setSetCount}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                  </View>
                </View>
                <Pressable
                  style={[styles.pairedToggle, isPairedMode && styles.pairedToggleActive]}
                  onPress={() => setIsPairedMode((v) => !v)}
                >
                  <Text style={[styles.pairedToggleText, isPairedMode && styles.pairedToggleTextActive]}>
                    ペア種目（右/左）
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.pairedToggle, includeLastInterval && styles.pairedToggleActive]}
                  onPress={() => setIncludeLastInterval((v) => !v)}
                >
                  <Text style={[styles.pairedToggleText, includeLastInterval && styles.pairedToggleTextActive]}>
                    最後も休憩
                  </Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleAddWorkoutSet}>
                  <Text style={styles.saveBtnText}>追加</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              style={styles.addItemBtn}
              onPress={() => {
                setIsExercisePickerOpen((v) => !v);
                setIsAiPanelOpen(false);
              }}
            >
              <Text style={styles.addItemText}>種目から追加</Text>
            </Pressable>

            {isExercisePickerOpen && (
              <View style={styles.aiPanel}>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="回数"
                  placeholderTextColor={Colors.textMuted}
                  value={pickerReps}
                  onChangeText={setPickerReps}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
                <Pressable
                  style={styles.addItemBtn}
                  onPress={() => {
                    setItems((prev) => [...prev, emptyItem()]);
                    setIsExercisePickerOpen(false);
                  }}
                >
                  <Text style={styles.addItemText}>空白で追加</Text>
                </Pressable>
                {MUSCLE_GROUPS.map((group) => (
                  <View key={group.id}>
                    <Text style={styles.aiPanelHeading}>{group.label}</Text>
                    <View style={styles.aiTagRow}>
                      {group.exercises.map((exercise) => (
                        <Pressable
                          key={exercise.id}
                          style={styles.aiTag}
                          onPress={() => {
                            const reps = parseInt(pickerReps, 10);
                            const title = reps > 0
                              ? `${exercise.name} ${reps}回`
                              : exercise.name;
                            setItems((prev) => [
                              ...prev,
                              { id: genId(), type: 'workout', title, durationSec: 30, voiceText: '' },
                            ]);
                            setIsExercisePickerOpen(false);
                          }}
                        >
                          <Text style={styles.aiTagText}>{exercise.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {generateAiRoutine && (
              <>
                <Pressable
                  style={styles.addItemBtn}
                  onPress={() => {
                    setIsAiPanelOpen((v) => !v);
                    setIsExercisePickerOpen(false);
                  }}
                >
                  <Text style={styles.addItemText}>AI で追加</Text>
                </Pressable>

                {isAiPanelOpen && (
                  <View style={styles.aiPanel}>
                    <Text style={styles.aiPanelHeading}>部位</Text>
                    <View style={styles.aiTagRow}>
                      {AI_BODY_PARTS.map((part) => (
                        <Pressable
                          key={part}
                          onPress={() =>
                            setAiParts((prev) =>
                              prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
                            )
                          }
                          style={[styles.aiTag, aiParts.includes(part) && styles.aiTagActive]}
                        >
                          <Text style={[styles.aiTagText, aiParts.includes(part) && styles.aiTagTextActive]}>
                            {part}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.aiPanelHeading}>トータル時間</Text>
                    <View style={styles.aiTagRow}>
                      {AI_DURATION_PRESETS.map((min) => (
                        <Pressable
                          key={min}
                          onPress={() => setAiMinutes(min)}
                          style={[styles.aiTag, aiMinutes === min && styles.aiTagActive]}
                        >
                          <Text style={[styles.aiTagText, aiMinutes === min && styles.aiTagTextActive]}>
                            {min}分
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <TextInput
                      style={[styles.input, { marginTop: 8 }]}
                      placeholder="追加リクエスト（任意）例: 初心者向け"
                      placeholderTextColor={Colors.textMuted}
                      value={aiExtra}
                      onChangeText={setAiExtra}
                      returnKeyType="done"
                    />

                    <Pressable
                      style={[styles.saveBtn, { marginTop: 10, opacity: (!aiParts.length || !aiMinutes || isAiLoading) ? 0.4 : 1 }]}
                      onPress={handleAiGenerate}
                      disabled={!aiParts.length || !aiMinutes || isAiLoading}
                    >
                      {isAiLoading
                        ? <ActivityIndicator color={Colors.text} />
                        : <Text style={styles.saveBtnText}>生成</Text>
                      }
                    </Pressable>
                  </View>
                )}
              </>
            )}

            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.saveBtnText}>保存</Text>
              )}
            </Pressable>
          </>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, gap: 4, paddingBottom: 48 },
  sectionLabel: { color: Colors.textSub, fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4, flex: 1 },
  itemsHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  viewToggle: { flexDirection: 'row', borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  viewToggleBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  viewToggleBtnActive: { backgroundColor: Colors.orange },
  viewToggleText: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  viewToggleTextActive: { color: Colors.bg },
  setGroupCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    gap: 8,
    marginBottom: 2,
  },
  setGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  setGroupLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  setGroupTitle: { fontSize: 14, color: Colors.text, fontWeight: '600', flex: 1 },
  setGroupMeta: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  setGroupCount: { fontSize: 12, color: Colors.textSub, fontWeight: '700' },
  setGroupItems: { gap: 2 },
  setGroupItemText: { fontSize: 12, color: Colors.textSub },
  fieldLabel: { color: Colors.textSub, fontSize: 12, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
  },
  itemCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    gap: 6,
    marginBottom: 2,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  itemSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  typeDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  itemSummaryTitle: { fontSize: 14, color: Colors.text, fontWeight: '600', flex: 1 },
  durationBadge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  durationBadgeText: { fontSize: 12, color: Colors.textSub },
  itemControls: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  duplicateBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  duplicateBtnText: { fontSize: 12, color: Colors.textSub },
  dragHandle: { fontSize: 18, color: Colors.textSub, paddingHorizontal: 4 },
  setForm: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  setFormRow: { flexDirection: 'row', gap: 8 },
  setFormField: { flex: 1 },
  typeToggle: { flexDirection: 'row', gap: 6 },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBtnText: { fontSize: 12, color: Colors.textSub },
  swipeDeleteAction: {
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 2,
    borderRadius: 14,
  },
  swipeDeleteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetBtnActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  presetText: { fontSize: 12, color: Colors.textSub },
  presetTextActive: { color: Colors.bg, fontWeight: '700' },
  addItemBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  addItemText: { color: Colors.orange, fontSize: 14, fontWeight: '600' },
  pairedToggle: {
    borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder,
    paddingVertical: 10, alignItems: 'center', marginTop: 8,
  },
  pairedToggleActive: { borderColor: Colors.orange, backgroundColor: `${Colors.orange}18` },
  pairedToggleText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  pairedToggleTextActive: { color: Colors.orange },
  aiPanel: { backgroundColor: '#1E1E21', borderRadius: 14, borderWidth: 1, borderColor: '#818CF830', padding: 14, gap: 8, marginBottom: 8 },
  aiPanelHeading: { color: '#A0A0A5', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  aiTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aiTag: { backgroundColor: '#2C2C30', borderRadius: 10, borderWidth: 1, borderColor: '#3C3C42', paddingHorizontal: 12, paddingVertical: 6 },
  aiTagActive: { backgroundColor: '#818CF8', borderColor: '#818CF8' },
  aiTagText: { color: '#A0A0A5', fontSize: 13, fontWeight: '600' },
  aiTagTextActive: { color: '#F5F5F5' },
  saveBtn: {
    backgroundColor: Colors.orange,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 4 },
});
