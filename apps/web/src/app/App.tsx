import { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { SupabaseAuthService } from '../features/auth/SupabaseAuthService';
import type { AuthService, AuthUser } from '@timeapp/core';
import type { RoutineRepository } from '@timeapp/core';
import type { Routine } from '@timeapp/core';
import { duplicateRoutine } from '@timeapp/core';
import { GoRoutineRepository } from '../features/routines/goRoutineRepository';
import { BrowserVoiceService } from '../features/voice/browserVoiceService';
import { BrowserWakeLockService } from '../features/wakeLock/browserWakeLockService';
import type { VoiceService } from '@timeapp/core';
import type { WakeLockService } from '@timeapp/core';
import { AuthPage } from '../pages/AuthPage';
import { AppRoutes } from './routes';

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
  createRoutineRepository = (user) => new GoRoutineRepository(user.id),
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

  useEffect(() => {
    setIsLoaded(false);
    void reload();
  }, [repository]);

  async function reload() {
    const savedRoutines = await repository.findAll();
    setRoutines(savedRoutines);
    setIsLoaded(true);
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

function LoadingPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-lg place-items-center p-4">
      <p className="m-0 text-xs font-black tracking-[0.25em] uppercase text-[#A0A0A5]">
        読み込み中...
      </p>
    </main>
  );
}
