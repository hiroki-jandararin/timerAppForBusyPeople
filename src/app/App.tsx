import { useEffect, useMemo, useState } from 'react';
import { RoutineEditPage } from '../pages/RoutineEditPage';
import { RoutineListPage } from '../pages/RoutineListPage';
import { TimerPage } from '../pages/TimerPage';
import { createDefaultRoutine } from '../features/routines/defaultRoutine';
import { createRoutine } from '../features/routines/routineFactory';
import { duplicateRoutine } from '../features/routines/routineOperations';
import { LocalStorageRoutineRepository } from '../features/routines/localStorageRoutineRepository';
import type { Routine } from '../features/routines/routineTypes';
import { BrowserVoiceService } from '../features/voice/browserVoiceService';
import { BrowserWakeLockService } from '../features/wakeLock/browserWakeLockService';

type View =
  | { name: 'list' }
  | { name: 'edit'; routineId: string }
  | { name: 'timer'; routineId: string };

const DEFAULT_ROUTINE_SEEDED_KEY = 'workout_timer_default_routine_seeded_v2';
const DEFAULT_ROUTINE_NAME = '全身トレーニング';

export function App() {
  const repository = useMemo(() => new LocalStorageRoutineRepository(), []);
  const voiceService = useMemo(() => new BrowserVoiceService(), []);
  const wakeLockService = useMemo(() => new BrowserWakeLockService(), []);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [view, setView] = useState<View>({ name: 'list' });

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    const savedRoutines = await repository.findAll();
    const hasDefaultRoutine = savedRoutines.some(
      (routine) => routine.name === DEFAULT_ROUTINE_NAME
    );
    if (!hasDefaultRoutine && localStorage.getItem(DEFAULT_ROUTINE_SEEDED_KEY) !== 'true') {
      const defaultRoutine = createDefaultRoutine();
      await repository.save(defaultRoutine);
      localStorage.setItem(DEFAULT_ROUTINE_SEEDED_KEY, 'true');
      setRoutines([...savedRoutines, defaultRoutine]);
      return;
    }
    setRoutines(savedRoutines);
  }

  async function createNewRoutine() {
    const routine = createRoutine();
    await repository.save(routine);
    await reload();
    setView({ name: 'edit', routineId: routine.id });
  }

  async function saveRoutine(routine: Routine) {
    await repository.save(routine);
    await reload();
    setView({ name: 'list' });
  }

  async function removeRoutine(id: string) {
    const routine = routines.find((item) => item.id === id);
    if (!routine) return;
    if (!confirm(`「${routine.name}」を削除しますか？`)) return;
    await repository.delete(id);
    await reload();
  }

  async function copyRoutine(routine: Routine) {
    await repository.save(duplicateRoutine(routine));
    await reload();
  }

  const selectedRoutine =
    'routineId' in view ? routines.find((routine) => routine.id === view.routineId) : undefined;

  if (view.name === 'edit' && selectedRoutine) {
    return (
      <RoutineEditPage
        routine={selectedRoutine}
        onSave={saveRoutine}
        onBack={() => setView({ name: 'list' })}
      />
    );
  }

  if (view.name === 'timer' && selectedRoutine) {
    return (
      <TimerPage
        routine={selectedRoutine}
        voiceService={voiceService}
        wakeLockService={wakeLockService}
        onBack={() => setView({ name: 'list' })}
      />
    );
  }

  return (
    <RoutineListPage
      routines={routines}
      onCreate={createNewRoutine}
      onEdit={(id) => setView({ name: 'edit', routineId: id })}
      onStart={(id) => setView({ name: 'timer', routineId: id })}
      onDuplicate={copyRoutine}
      onDelete={removeRoutine}
    />
  );
}
