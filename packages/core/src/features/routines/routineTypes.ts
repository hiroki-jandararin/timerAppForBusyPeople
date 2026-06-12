export type RoutineItemType = 'workout' | 'interval';

export type WorkoutItem = {
  id: string;
  type: 'workout';
  title: string;
  durationSec: number;
  voiceText: string;
  groupId?: string;
};

export type IntervalItem = {
  id: string;
  type: 'interval';
  title: string;
  durationSec: number;
  voiceText: string;
  groupId?: string;
};

export type RoutineItem = WorkoutItem | IntervalItem;

export type Routine = {
  id: string;
  name: string;
  targetDurationSec?: number | null;
  items: RoutineItem[];
  createdAt: string;
  updatedAt: string;
};
