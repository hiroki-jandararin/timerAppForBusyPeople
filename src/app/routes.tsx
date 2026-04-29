import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { createRoutine } from '../features/routines/routineFactory';
import { RoutineEditPage } from '../pages/RoutineEditPage';
import { RoutineListPage } from '../pages/RoutineListPage';
import { TimerPage } from '../pages/TimerPage';
import type { Routine } from '../features/routines/routineTypes';
import type { VoiceService } from '../features/voice/voiceService';
import type { WakeLockService } from '../features/wakeLock/wakeLockService';

type AppRoutesProps = {
  isLoaded: boolean;
  routines: Routine[];
  onSave: (routine: Routine) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (routine: Routine) => Promise<void>;
  voiceService: VoiceService;
  wakeLockService: WakeLockService;
};

export function AppRoutes({
  isLoaded,
  routines,
  onSave,
  onDelete,
  onDuplicate,
  voiceService,
  wakeLockService,
}: AppRoutesProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ListRoute
              isLoaded={isLoaded}
              routines={routines}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          }
        />
        <Route
          path="/routines/new"
          element={<NewRoute isLoaded={isLoaded} routines={routines} onSave={onSave} />}
        />
        <Route
          path="/routines/:routineId/edit"
          element={<EditRoute isLoaded={isLoaded} routines={routines} onSave={onSave} />}
        />
        <Route
          path="/routines/:routineId/timer"
          element={
            <TimerRoute
              isLoaded={isLoaded}
              routines={routines}
              voiceService={voiceService}
              wakeLockService={wakeLockService}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

type ListRouteProps = {
  isLoaded: boolean;
  routines: Routine[];
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (routine: Routine) => Promise<void>;
};

function ListRoute({ isLoaded, routines, onDelete, onDuplicate }: ListRouteProps) {
  const navigate = useNavigate();

  if (!isLoaded) {
    return <LoadingPage />;
  }

  return (
    <RoutineListPage
      routines={routines}
      onCreate={() => navigate('/routines/new')}
      onEdit={(id) => navigate(`/routines/${id}/edit`)}
      onStart={(id) => navigate(`/routines/${id}/timer`)}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    />
  );
}

type NewRouteProps = {
  isLoaded: boolean;
  routines: Routine[];
  onSave: (routine: Routine) => Promise<void>;
};

function NewRoute({ isLoaded, routines, onSave }: NewRouteProps) {
  const navigate = useNavigate();

  if (!isLoaded) {
    return <LoadingPage />;
  }

  const routine = createRoutine();

  return (
    <RoutineEditPage
      routine={routine}
      existingRoutines={routines}
      onSave={async (nextRoutine) => {
        await onSave(nextRoutine);
        navigate('/');
      }}
      onBack={() => navigate('/')}
    />
  );
}

type EditRouteProps = {
  isLoaded: boolean;
  routines: Routine[];
  onSave: (routine: Routine) => Promise<void>;
};

function EditRoute({ isLoaded, routines, onSave }: EditRouteProps) {
  const navigate = useNavigate();
  const { routineId } = useParams();

  if (!isLoaded) {
    return <LoadingPage />;
  }

  const routine = routineId ? routines.find((item) => item.id === routineId) : undefined;
  if (!routine) {
    return <Navigate to="/" replace />;
  }

  return (
    <RoutineEditPage
      routine={routine}
      existingRoutines={routines}
      onSave={async (nextRoutine) => {
        await onSave(nextRoutine);
        navigate('/');
      }}
      onBack={() => navigate('/')}
    />
  );
}

type TimerRouteProps = {
  isLoaded: boolean;
  routines: Routine[];
  voiceService: VoiceService;
  wakeLockService: WakeLockService;
};

function TimerRoute({ isLoaded, routines, voiceService, wakeLockService }: TimerRouteProps) {
  const navigate = useNavigate();
  const { routineId } = useParams();

  if (!isLoaded) {
    return <LoadingPage />;
  }

  const routine = routineId ? routines.find((item) => item.id === routineId) : undefined;
  if (!routine) {
    return <Navigate to="/" replace />;
  }

  return (
    <TimerPage
      routine={routine}
      voiceService={voiceService}
      wakeLockService={wakeLockService}
      onBack={() => navigate('/')}
    />
  );
}

function LoadingPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[720px] place-items-center p-4 text-[#241710] sm:p-5">
      <p className="m-0 text-sm font-medium text-[#8a4b23]">読み込み中</p>
    </main>
  );
}
