import { useEffect, useMemo, useRef, useState } from 'react';
import type { Routine } from '../features/routines/routineTypes';
import { createDefaultRoutine } from '../features/routines/defaultRoutine';
import { duplicateRoutine } from '../features/routines/routineOperations';
import { LocalStorageRoutineRepository } from '../features/routines/localStorageRoutineRepository';
import { BrowserVoiceService } from '../features/voice/browserVoiceService';
import { BrowserWakeLockService } from '../features/wakeLock/browserWakeLockService';
import type { VoiceService } from '../features/voice/voiceService';
import type { WakeLockService } from '../features/wakeLock/wakeLockService';
import { AppRoutes } from './routes';

const DEFAULT_ROUTINE_SEEDED_KEY = 'workout_timer_default_routine_seeded_v2';
const DEFAULT_ROUTINE_NAME = '全身トレーニング';

export function App() {
  const repository = useMemo(() => new LocalStorageRoutineRepository(), []);
  const voiceService = useMemo<VoiceService>(() => new BrowserVoiceService(), []);
  const wakeLockService = useMemo<WakeLockService>(() => new BrowserWakeLockService(), []);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isSeedingDefaultRoutine = useRef(false);

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    const savedRoutines = await repository.findAll();
    const normalizedRoutines = await removeDuplicatedDefaultRoutines(savedRoutines);
    const hasDefaultRoutine = normalizedRoutines.some(
      (routine) => routine.name === DEFAULT_ROUTINE_NAME,
    );
    if (
      !hasDefaultRoutine &&
      localStorage.getItem(DEFAULT_ROUTINE_SEEDED_KEY) !== 'true' &&
      !isSeedingDefaultRoutine.current
    ) {
      isSeedingDefaultRoutine.current = true;
      const defaultRoutine = createDefaultRoutine();
      await repository.save(defaultRoutine);
      localStorage.setItem(DEFAULT_ROUTINE_SEEDED_KEY, 'true');
      setRoutines([...normalizedRoutines, defaultRoutine]);
      setIsLoaded(true);
      isSeedingDefaultRoutine.current = false;
      return;
    }
    setRoutines(normalizedRoutines);
    setIsLoaded(true);
  }

  async function removeDuplicatedDefaultRoutines(savedRoutines: Routine[]) {
    const defaultRoutines = savedRoutines.filter(
      (routine) => routine.name === DEFAULT_ROUTINE_NAME,
    );
    if (defaultRoutines.length <= 1) return savedRoutines;

    const [, ...duplicatedDefaults] = defaultRoutines;
    await Promise.all(duplicatedDefaults.map((routine) => repository.delete(routine.id)));
    return savedRoutines.filter(
      (routine) => !duplicatedDefaults.some((duplicated) => duplicated.id === routine.id),
    );
  }

  async function saveRoutine(routine: Routine) {
    await repository.save(routine);
    await reload();
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

  return (
    <AppRoutes
      isLoaded={isLoaded}
      routines={routines}
      onSave={saveRoutine}
      onDelete={removeRoutine}
      onDuplicate={copyRoutine}
      voiceService={voiceService}
      wakeLockService={wakeLockService}
    />
  );
}
