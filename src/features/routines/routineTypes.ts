export type RoutineItemType = 'workout' | 'interval';

export type WorkoutItem = {
  id: string;
  type: 'workout';
  title: string;
  durationSec: number;
  voiceText: string;
};

export type IntervalItem = {
  id: string;
  type: 'interval';
  title: string;
  durationSec: number;
  voiceText: string;
};

export type RoutineItem = WorkoutItem | IntervalItem;

export type Routine = {
  id: string;
  name: string;
  items: RoutineItem[];
  createdAt: string;
  updatedAt: string;
};
