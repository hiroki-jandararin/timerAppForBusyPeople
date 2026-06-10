import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { createRoutine, createRoutineFromTemplate } from '@timeapp/core';
import type { RoutineTemplate } from '@timeapp/core';
import type { CreateWorkoutHistoryInput, WorkoutHistory } from '@timeapp/core';
import { RoutineEditPage } from '../pages/RoutineEditPage';
import { RoutineListPage } from '../pages/RoutineListPage';
import { TemplateSelectPage } from '../pages/TemplateSelectPage';
import { AIPromptPage } from '../pages/AIPromptPage';
import { CreateMethodPage } from '../pages/CreateMethodPage';
import { TimerPage } from '../pages/TimerPage';
import { HistoryPage } from '../pages/HistoryPage';
import type { Routine } from '@timeapp/core';
import type { VoiceService } from '@timeapp/core';
import type { WakeLockService } from '@timeapp/core';

type AppRoutesProps = {
  isLoaded: boolean;
  routines: Routine[];
  histories: WorkoutHistory[];
  onSave: (routine: Routine) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (routine: Routine) => Promise<void>;
  onSaveHistory: (input: CreateWorkoutHistoryInput) => Promise<void>;
  generateAiRoutine: (prompt: string, targetDurationSec?: number) => Promise<Routine>;
  currentUserEmail: string | null;
  onSignOut: () => Promise<void>;
  voiceService: VoiceService;
  wakeLockService: WakeLockService;
};

export function AppRoutes({
  isLoaded,
  routines,
  histories,
  onSave,
  onDelete,
  onDuplicate,
  onSaveHistory,
  generateAiRoutine,
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
          element={
            <NewRoute
              isLoaded={isLoaded}
              routines={routines}
              onSave={onSave}
              generateAiRoutine={generateAiRoutine}
            />
          }
        />
        <Route
          path="/routines/:routineId/edit"
          element={<EditRoute isLoaded={isLoaded} routines={routines} onSave={onSave} generateAiRoutine={generateAiRoutine} />}
        />
        <Route
          path="/routines/:routineId/timer"
          element={
            <TimerRoute
              isLoaded={isLoaded}
              routines={routines}
              voiceService={voiceService}
              wakeLockService={wakeLockService}
              onSaveHistory={onSaveHistory}
            />
          }
        />
        <Route
          path="/history"
          element={<HistoryRoute histories={histories} />}
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
      onShowHistory={() => navigate('/history')}
    />
  );
}

type NewRouteProps = {
  isLoaded: boolean;
  routines: Routine[];
  onSave: (routine: Routine) => Promise<void>;
  generateAiRoutine: (prompt: string, targetDurationSec?: number) => Promise<Routine>;
};

type NewRouteState =
  | { step: 'method' }
  | { step: 'template' }
  | { step: 'ai' }
  | { step: 'edit'; routine: Routine };

function NewRoute({ isLoaded, routines, onSave, generateAiRoutine }: NewRouteProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<NewRouteState>({ step: 'method' });

  if (!isLoaded) {
    return <LoadingPage />;
  }

  if (state.step === 'method') {
    return (
      <CreateMethodPage
        onSelectAI={() => setState({ step: 'ai' })}
        onSelectTemplate={() => setState({ step: 'template' })}
        onSelectBlank={() => setState({ step: 'edit', routine: createRoutine() })}
        onBack={() => navigate('/')}
      />
    );
  }

  if (state.step === 'template') {
    return (
      <TemplateSelectPage
        onSelect={(template: RoutineTemplate) =>
          setState({ step: 'edit', routine: createRoutineFromTemplate(template) })
        }
        onBack={() => setState({ step: 'method' })}
      />
    );
  }

  if (state.step === 'ai') {
    return (
      <AIPromptPage
        generateAiRoutine={generateAiRoutine}
        onGenerate={(routine) => setState({ step: 'edit', routine })}
        onBack={() => setState({ step: 'method' })}
      />
    );
  }

  return (
    <RoutineEditPage
      routine={state.routine}
      existingRoutines={routines}
      onSave={async (nextRoutine) => {
        await onSave(nextRoutine);
        navigate('/');
      }}
      onBack={() => setState({ step: 'method' })}
      generateAiRoutine={generateAiRoutine}
    />
  );
}

type EditRouteProps = {
  isLoaded: boolean;
  routines: Routine[];
  onSave: (routine: Routine) => Promise<void>;
  generateAiRoutine: (prompt: string, targetDurationSec?: number) => Promise<Routine>;
};

function EditRoute({ isLoaded, routines, onSave, generateAiRoutine }: EditRouteProps) {
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
      generateAiRoutine={generateAiRoutine}
    />
  );
}

type TimerRouteProps = {
  isLoaded: boolean;
  routines: Routine[];
  voiceService: VoiceService;
  wakeLockService: WakeLockService;
  onSaveHistory: (input: CreateWorkoutHistoryInput) => Promise<void>;
};

function TimerRoute({ isLoaded, routines, voiceService, wakeLockService, onSaveHistory }: TimerRouteProps) {
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
      onSaveHistory={onSaveHistory}
    />
  );
}

function HistoryRoute({ histories }: { histories: WorkoutHistory[] }) {
  const navigate = useNavigate();
  return <HistoryPage histories={histories} onBack={() => navigate('/')} />;
}

function LoadingPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-180 place-items-center p-4 text-[#241710] sm:p-5">
      <p className="m-0 text-sm font-medium text-[#8a4b23]">読み込み中</p>
    </main>
  );
}
