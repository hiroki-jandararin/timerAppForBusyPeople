export type Exercise = {
  id: string;
  name: string;
};

export type MuscleGroup = {
  id: string;
  label: string;
  exercises: Exercise[];
};

export const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    id: 'chest',
    label: '胸',
    exercises: [
      { id: 'bench-press', name: 'ベンチプレス' },
    ],
  },
  {
    id: 'back',
    label: '背中',
    exercises: [
      { id: 'lat-pulldown', name: 'ラットプルダウン' },
      { id: 'chin-up', name: '懸垂（チンアップ）' },
    ],
  },
  {
    id: 'shoulder',
    label: '肩',
    exercises: [
      { id: 'shoulder-press', name: 'ショルダープレス' },
      { id: 'side-raise', name: 'サイドレイズ' },
    ],
  },
  {
    id: 'biceps',
    label: '腕（前）',
    exercises: [
      { id: 'barbell-curl', name: 'バーベルカール' },
      { id: 'dumbbell-curl-right', name: 'ダンベルカール（右）' },
      { id: 'dumbbell-curl-left', name: 'ダンベルカール（左）' },
    ],
  },
  {
    id: 'triceps',
    label: '腕（後ろ）',
    exercises: [
      { id: 'triceps-pressdown', name: 'トライセプスプレスダウン' },
    ],
  },
  {
    id: 'quads',
    label: '足（前）',
    exercises: [
      { id: 'squat', name: 'スクワット' },
      { id: 'leg-extension', name: 'レッグエクステンション' },
      { id: 'bulgarian-split-squat', name: 'ブルガリアンスプリットスクワット' },
    ],
  },
  {
    id: 'hamstrings',
    label: '足（後ろ）',
    exercises: [
      { id: 'deadlift', name: 'デッドリフト' },
      { id: 'leg-curl', name: 'レッグカール' },
    ],
  },
  {
    id: 'abs',
    label: '腹筋',
    exercises: [
      { id: 'crunch', name: 'クランチ' },
      { id: 'plank', name: 'プランク' },
      { id: 'ab-roller', name: 'アブローラー' },
    ],
  },
  {
    id: 'lower-back',
    label: '背筋',
    exercises: [
      { id: 'back-extension', name: 'バックエクステンション' },
      { id: 'deadlift-lower-back', name: 'デッドリフト' },
    ],
  },
  {
    id: 'calves',
    label: 'ふくらはぎ',
    exercises: [
      { id: 'standing-calf-raise', name: 'スタンディングカーフレイズ' },
      { id: 'seated-calf-raise', name: 'シーテッドカーフレイズ' },
    ],
  },
];
