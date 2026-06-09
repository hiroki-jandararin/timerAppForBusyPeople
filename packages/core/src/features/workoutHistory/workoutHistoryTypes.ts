export type WorkoutHistory = {
  id: string;
  userId: string;
  routineId: string | null;
  routineName: string;
  startedAt: string;
  finishedAt: string;
  completed: boolean;
  itemsCount: number;
  itemsCompleted: number;
  createdAt: string;
};

export type CreateWorkoutHistoryInput = {
  id: string;
  routineId: string | null;
  routineName: string;
  startedAt: string;
  finishedAt: string;
  completed: boolean;
  itemsCount: number;
  itemsCompleted: number;
};
