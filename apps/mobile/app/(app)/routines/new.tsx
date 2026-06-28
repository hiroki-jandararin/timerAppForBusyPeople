import RoutineForm from '@/components/RoutineForm';
import { useAuth } from '@/contexts/AuthContext';
import { consumePendingAiRoutine } from '@/features/ai/aiRoutineStore';
import { emitRoutineChanged } from '@/features/routines/routineEvents';
import { routineApiClient, type CreateRoutineInput } from '@timeapp/api-client';
import { ROUTINE_TEMPLATES, createRoutineFromTemplate } from '@timeapp/core';
import { useLocalSearchParams, useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export default function NewRoutineScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();

  const api = routineApiClient({ baseUrl: API_BASE_URL, getToken: () => token });

  const pendingAiRoutine = consumePendingAiRoutine();
  const template = templateId ? ROUTINE_TEMPLATES.find((t) => t.id === templateId) : undefined;
  const initialValues = pendingAiRoutine ?? (template ? createRoutineFromTemplate(template) : undefined);

  return (
    <RoutineForm
      title="ルーティン作成"
      initialValues={initialValues}
      onSubmit={async (input: CreateRoutineInput) => {
        await api.create(input);
        emitRoutineChanged();
        router.dismissAll();
      }}
    />
  );
}
