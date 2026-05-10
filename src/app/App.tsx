import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { SupabaseAuthService } from '../features/auth/SupabaseAuthService';
import type { AuthService, AuthUser } from '../features/auth/authTypes';
import type { RoutineRepository } from '../features/routines/routineRepository';
import type { Routine } from '../features/routines/routineTypes';
import { createDefaultRoutine } from '../features/routines/defaultRoutine';
import { duplicateRoutine } from '../features/routines/routineOperations';
import { SupabaseRoutineRepository } from '../features/routines/supabaseRoutineRepository';
import { BrowserVoiceService } from '../features/voice/browserVoiceService';
import { BrowserWakeLockService } from '../features/wakeLock/browserWakeLockService';
import type { VoiceService } from '../features/voice/voiceService';
import type { WakeLockService } from '../features/wakeLock/wakeLockService';
import { AuthPage } from '../pages/AuthPage';
import { AppRoutes } from './routes';

const DEFAULT_ROUTINE_SEEDED_KEY = 'workout_timer_default_routine_seeded_v2';
const DEFAULT_ROUTINE_NAME = '全身トレーニング';

type CreateRoutineRepository = (user: AuthUser) => RoutineRepository;

export function App() {
  const authService = useMemo<AuthService>(() => new SupabaseAuthService(), []);

  return <AuthenticatedApp authService={authService} />;
}

type AuthenticatedAppProps = {
  authService: AuthService;
  createRoutineRepository?: CreateRoutineRepository;
};

export function AuthenticatedApp({
  authService,
  createRoutineRepository = (user) => new SupabaseRoutineRepository(user.id),
}: AuthenticatedAppProps) {
  return (
    <AuthProvider authService={authService}>
      <AppShell createRoutineRepository={createRoutineRepository} />
    </AuthProvider>
  );
}

type AppShellProps = {
  createRoutineRepository: CreateRoutineRepository;
};

function AppShell({ createRoutineRepository }: AppShellProps) {
  const auth = useAuth();

  if (auth.isLoading) {
    return <LoadingPage />;
  }

  if (!auth.user) {
    return <AuthPage onSignIn={auth.signIn} onSignUp={auth.signUp} />;
  }

  return (
    <RoutineApp
      user={auth.user}
      createRoutineRepository={createRoutineRepository}
      onSignOut={auth.signOut}
    />
  );
}

type RoutineAppProps = {
  user: AuthUser;
  createRoutineRepository: CreateRoutineRepository;
  onSignOut: () => Promise<void>;
};

function RoutineApp({ user, createRoutineRepository, onSignOut }: RoutineAppProps) {
  const repository = useMemo(() => createRoutineRepository(user), [createRoutineRepository, user]);
  const voiceService = useMemo<VoiceService>(() => new BrowserVoiceService(), []);
  const wakeLockService = useMemo<WakeLockService>(() => new BrowserWakeLockService(), []);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isSeedingDefaultRoutine = useRef(false);

  useEffect(() => {
    setIsLoaded(false);
    void reload();
  }, [repository]);

  async function reload() {
    const savedRoutines = await repository.findAll();
    const normalizedRoutines = await removeDuplicatedDefaultRoutines(savedRoutines);
    const hasDefaultRoutine = normalizedRoutines.some(
      (routine) => routine.name === DEFAULT_ROUTINE_NAME
    );
    if (
      !hasDefaultRoutine &&
      localStorage.getItem(createDefaultRoutineSeededKey(user.id)) !== 'true' &&
      !isSeedingDefaultRoutine.current
    ) {
      isSeedingDefaultRoutine.current = true;
      const defaultRoutine = createDefaultRoutine();
      await repository.save(defaultRoutine);
      localStorage.setItem(createDefaultRoutineSeededKey(user.id), 'true');
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
      (routine) => routine.name === DEFAULT_ROUTINE_NAME
    );
    if (defaultRoutines.length <= 1) return savedRoutines;

    const [, ...duplicatedDefaults] = defaultRoutines;
    await Promise.all(duplicatedDefaults.map((routine) => repository.delete(routine.id)));
    return savedRoutines.filter(
      (routine) => !duplicatedDefaults.some((duplicated) => duplicated.id === routine.id)
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
      currentUserEmail={user.email}
      onSignOut={onSignOut}
      voiceService={voiceService}
      wakeLockService={wakeLockService}
    />
  );
}

function createDefaultRoutineSeededKey(userId: string) {
  return `${DEFAULT_ROUTINE_SEEDED_KEY}_${userId}`;
}

function LoadingPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-180 place-items-center p-4 text-[#241710] sm:p-5">
      <p className="m-0 text-sm font-medium text-[#8a4b23]">読み込み中</p>
    </main>
  );
}
