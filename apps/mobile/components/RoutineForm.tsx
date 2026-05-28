import { Colors } from '@/constants/colors';
import type { CreateRoutineInput } from '@timeapp/api-client';
import type { Routine, RoutineItem } from '@timeapp/core';
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
};

const DURATION_PRESETS = [15, 20, 30, 45, 60, 90, 120];

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function emptyItem(): RoutineItem {
  return { id: genId(), type: 'workout', title: '', durationSec: 30, voiceText: '' };
}

export default function RoutineForm({ title, initialValues, onSubmit }: Props) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [items, setItems] = useState<RoutineItem[]>(
    initialValues?.items.length ? initialValues.items : [emptyItem()],
  );
  const [saving, setSaving] = useState(false);

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
      await onSubmit({ name: name.trim(), items });
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

        <Text style={styles.sectionLabel}>アイテム</Text>
        {items.map((item, index) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
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
                      {t === 'workout' ? '種目' : '休憩'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => removeItem(index)} hitSlop={8}>
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
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
          </View>
        ))}

        <Pressable style={styles.addItemBtn} onPress={() => setItems((prev) => [...prev, emptyItem()])}>
          <Text style={styles.addItemText}>＋ アイテムを追加</Text>
        </Pressable>

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
  scroll: { padding: 16, gap: 8, paddingBottom: 48 },
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
    marginBottom: 8,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  saveBtn: {
    backgroundColor: Colors.orange,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
});
