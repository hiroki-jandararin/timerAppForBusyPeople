import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { createRoutine } from '@timeapp/core';
import { createRoutineFromTemplate, type RoutineTemplate } from '@timeapp/core';
import { RoutineEditPage } from '../pages/RoutineEditPage';
import { RoutineListPage } from '../pages/RoutineListPage';
import { TemplateSelectPage } from '../pages/TemplateSelectPage';
import { TimerPage } from '../pages/TimerPage';
import type { Routine } from '@timeapp/core';
import type { VoiceService } from '@timeapp/core';
import type { WakeLockService } from '@timeapp/core';

type AppRoutesProps = {
  isLoaded: boolean;
  routines: Routine[];
  onSave: (routine: Routine) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (routine: Routine) => Promise<void>;
  currentUserEmail: string | null;
  onSignOut: () => Promise<void>;
  voiceService: VoiceService;
  wakeLockService: WakeLockService;
};

export function AppRoutes({
  isLoaded,
  routines,
  onSave,
  onDelete,
  onDuplicate,
  currentUserEmail,
  onSignOut,
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
              currentUserEmail={currentUserEmail}
              onSignOut={onSignOut}
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
  currentUserEmail: string | null;
  onSignOut: () => Promise<void>;
};

function ListRoute({
  isLoaded,
  routines,
  onDelete,
  onDuplicate,
  currentUserEmail,
  onSignOut,
}: ListRouteProps) {
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
      currentUserEmail={currentUserEmail}
      onSignOut={onSignOut}
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
  const [selectedTemplate, setSelectedTemplate] = useState<RoutineTemplate | null | 'blank'>(null);

  if (!isLoaded) {
    return <LoadingPage />;
  }

  if (selectedTemplate === null) {
    return (
      <TemplateSelectPage
        onSelect={(template) => setSelectedTemplate(template ?? 'blank')}
        onBack={() => navigate('/')}
      />
    );
  }

  const routine =
    selectedTemplate === 'blank'
      ? createRoutine()
      : createRoutineFromTemplate(selectedTemplate);

  return (
    <RoutineEditPage
      routine={routine}
      existingRoutines={routines}
      onSave={async (nextRoutine) => {
        await onSave(nextRoutine);
        navigate('/');
      }}
      onBack={() => setSelectedTemplate(null)}
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
    <main className="mx-auto grid min-h-screen w-full max-w-180 place-items-center p-4 text-[#241710] sm:p-5">
      <p className="m-0 text-sm font-medium text-[#8a4b23]">読み込み中</p>
    </main>
  );
}
