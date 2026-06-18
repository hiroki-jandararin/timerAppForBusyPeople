import { Colors } from '@/constants/colors';
import type { CreateRoutineInput } from '@timeapp/api-client';
import { addWorkoutSet, addPairedWorkoutSet, type Routine, type RoutineItem } from '@timeapp/core';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

  const toggleExpand = (id: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [setFormOpen, setSetFormOpen] = useState(false);
  const [isPairedMode, setIsPairedMode] = useState(false);
  const [setTitle, setSetTitle] = useState('');
  const [setCount, setSetCount] = useState('3');
  const [workoutSec, setWorkoutSec] = useState('60');
  const [intervalSec, setIntervalSec] = useState('90');
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
      includeLastInterval: false,
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

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveItemDown = (index: number) => {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const duplicateItem = (index: number) => {
    setItems((prev) => {
      const copy = { ...prev[index], id: genId() };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('', 'ルーティン名を入力してください');
      return;
    }
    const invalid = items.find((item) => !item.title.trim());
    if (invalid) {
      Alert.alert('', '全アイテムのタイトルを入力してください');
      return;
    }
    setSaving(true);
    try {
      const minutes = parseInt(targetDurationText, 10);
      const targetDurationSec = !isNaN(minutes) && minutes > 0 ? minutes * 60 : null;
      await onSubmit({ name: name.trim(), items, targetDurationSec });
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>ルーティン名</Text>
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
          onChangeText={setTargetDurationText}
          keyboardType="numeric"
          returnKeyType="done"
        />

        <Text style={styles.sectionLabel}>アイテム</Text>
        {items.map((item, index) => {
          const isExpanded = expandedItemIds.has(item.id);
          const durationLabel = item.durationSec < 60 ? `${item.durationSec}秒` : `${item.durationSec / 60}分`;
          return (
            <View key={item.id} style={styles.itemCard}>
              <Pressable style={styles.itemHeader} onPress={() => toggleExpand(item.id)}>
                <View style={styles.itemSummary}>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: item.type === 'workout' ? Colors.orange : Colors.green },
                  ]}>
                    <Text style={styles.typeBadgeText}>{item.type === 'workout' ? 'ワークアウト' : 'インターバル'}</Text>
                  </View>
                  <Text style={styles.itemSummaryTitle} numberOfLines={1}>
                    {item.title || 'アイテム名未設定'}
                  </Text>
                  <Text style={styles.itemSummaryDuration}>{durationLabel}</Text>
                </View>
                <View style={styles.itemControls}>
                  <Pressable onPress={() => moveItemUp(index)} hitSlop={8}>
                    <Text style={styles.controlText}>↑</Text>
                  </Pressable>
                  <Pressable onPress={() => moveItemDown(index)} hitSlop={8}>
                    <Text style={styles.controlText}>↓</Text>
                  </Pressable>
                  <Pressable onPress={() => duplicateItem(index)} hitSlop={8}>
                    <Text style={styles.controlText}>複製</Text>
                  </Pressable>
                  <Pressable onPress={() => removeItem(index)} hitSlop={8}>
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>
              </Pressable>

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
                </>
              )}
            </View>
          );
        })}

        <Pressable style={styles.addItemBtn} onPress={() => setItems((prev) => [...prev, emptyItem()])}>
          <Text style={styles.addItemText}>＋ アイテムを追加</Text>
        </Pressable>

        <Pressable style={styles.addItemBtn} onPress={() => setSetFormOpen((v) => !v)}>
          <Text style={styles.addItemText}>セットを追加</Text>
        </Pressable>

        {setFormOpen && (
          <View style={styles.setForm}>
            <TextInput
              style={styles.input}
              placeholder="ワークアウト名"
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
            <Pressable style={styles.saveBtn} onPress={handleAddWorkoutSet}>
              <Text style={styles.saveBtnText}>追加</Text>
            </Pressable>
          </View>
        )}

        {generateAiRoutine && (
          <>
            <Pressable style={styles.addItemBtn} onPress={() => setIsAiPanelOpen((v) => !v)}>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, gap: 4, paddingBottom: 48 },
  sectionLabel: { color: Colors.textSub, fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
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
  typeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  typeBadgeText: { fontSize: 12, color: Colors.bg, fontWeight: '700' },
  itemSummaryTitle: { fontSize: 14, color: Colors.text, fontWeight: '600', flex: 1 },
  itemSummaryDuration: { fontSize: 13, color: Colors.textSub },
  itemControls: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  controlText: { fontSize: 14, color: Colors.textSub },
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
  removeText: { color: Colors.red, fontSize: 16 },
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
});
