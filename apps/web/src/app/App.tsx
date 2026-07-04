import { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { SupabaseAuthService } from '../features/auth/SupabaseAuthService';
import type { AuthService, AuthUser } from '@timeapp/core';
import type { RoutineRepository } from '@timeapp/core';
import type { Routine, WorkoutHistory, CreateWorkoutHistoryInput } from '@timeapp/core';
import { duplicateRoutine } from '@timeapp/core';
import { GoRoutineRepository } from '../features/routines/goRoutineRepository';
import { generateAiRoutine } from '../features/ai/aiRoutineService';
import { GoWorkoutHistoryRepository } from '../features/workoutHistory/goWorkoutHistoryRepository';

type WorkoutHistoryRepository = {
  create: (input: CreateWorkoutHistoryInput) => Promise<WorkoutHistory>;
  findAll: () => Promise<WorkoutHistory[]>;
};
import { BrowserVoiceService } from '../features/voice/browserVoiceService';
import { BrowserWakeLockService } from '../features/wakeLock/browserWakeLockService';
import type { VoiceService } from '@timeapp/core';
import type { WakeLockService } from '@timeapp/core';
import { AuthPage } from '../pages/AuthPage';
import { AppRoutes } from './routes';

type CreateRoutineRepository = (user: AuthUser) => RoutineRepository;

export function App() {
  const authService = useMemo(() => new SupabaseAuthService(), []);
  const getToken = () => authService.getAccessToken();

  return (
    <AuthenticatedApp
      authService={authService}
      createRoutineRepository={() => new GoRoutineRepository(getToken)}
      historyRepository={new GoWorkoutHistoryRepository(getToken)}
      generateAiRoutine={(prompt, targetDurationSec) =>
        generateAiRoutine(prompt, getToken, targetDurationSec)
      }
    />
  );
}

type AuthenticatedAppProps = {
  authService: AuthService;
  createRoutineRepository: CreateRoutineRepository;
  historyRepository: WorkoutHistoryRepository;
  generateAiRoutine: (prompt: string, targetDurationSec?: number) => Promise<Routine>;
};

export function AuthenticatedApp({
  authService,
  createRoutineRepository,
  historyRepository,
  generateAiRoutine,
}: AuthenticatedAppProps) {
  return (
    <AuthProvider authService={authService}>
      <AppShell
        createRoutineRepository={createRoutineRepository}
        historyRepository={historyRepository}
        generateAiRoutine={generateAiRoutine}
      />
    </AuthProvider>
  );
}

type AppShellProps = {
  createRoutineRepository: CreateRoutineRepository;
  historyRepository: WorkoutHistoryRepository;
  generateAiRoutine: (prompt: string, targetDurationSec?: number) => Promise<Routine>;
};

function AppShell({
  createRoutineRepository,
  historyRepository,
  generateAiRoutine,
}: AppShellProps) {
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
      historyRepository={historyRepository}
      generateAiRoutine={generateAiRoutine}
      onSignOut={auth.signOut}
    />
  );
}

type RoutineAppProps = {
  user: AuthUser;
  createRoutineRepository: CreateRoutineRepository;
  historyRepository: WorkoutHistoryRepository;
  generateAiRoutine: (prompt: string, targetDurationSec?: number) => Promise<Routine>;
  onSignOut: () => Promise<void>;
};

function RoutineApp({
  user,
  createRoutineRepository,
  historyRepository,
  generateAiRoutine,
  onSignOut,
}: RoutineAppProps) {
  const repository = useMemo(() => createRoutineRepository(user), [createRoutineRepository, user]);
  const voiceService = useMemo<VoiceService>(() => new BrowserVoiceService(), []);
  const wakeLockService = useMemo<WakeLockService>(() => new BrowserWakeLockService(), []);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [histories, setHistories] = useState<WorkoutHistory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    void Promise.all([
      repository.findAll().then(setRoutines),
      historyRepository.findAll().then(setHistories),
    ]).then(() => setIsLoaded(true));
  }, [repository]);

  async function reload() {
    const savedRoutines = await repository.findAll();
    setRoutines(savedRoutines);
  }

  async function saveRoutine(routine: Routine) {
    const isNew = !routines.some((r) => r.id === routine.id);
    if (isNew) {
      await repository.create(routine);
    } else {
      await repository.update(routine);
    }
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
    await repository.create(duplicateRoutine(routine));
    await reload();
  }

  async function saveHistory(input: CreateWorkoutHistoryInput) {
    const created = await historyRepository.create(input);
    setHistories((prev) => [created, ...prev]);
  }

  return (
    <AppRoutes
      isLoaded={isLoaded}
      routines={routines}
      histories={histories}
      onSave={saveRoutine}
      onDelete={removeRoutine}
      onDuplicate={copyRoutine}
      onSaveHistory={saveHistory}
      generateAiRoutine={generateAiRoutine}
      currentUserEmail={user.email}
      onSignOut={onSignOut}
      voiceService={voiceService}
      wakeLockService={wakeLockService}
    />
  );
}

function LoadingPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-lg place-items-center p-4">
      <p className="m-0 text-xs font-black tracking-[0.25em] uppercase text-[#A0A0A5]">
        読み込み中...
      </p>
    </main>
  );
}
