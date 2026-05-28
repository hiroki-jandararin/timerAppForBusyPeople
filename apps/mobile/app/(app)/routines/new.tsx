import RoutineForm from '@/components/RoutineForm';
import { useAuth } from '@/contexts/AuthContext';
import { routineApiClient, type CreateRoutineInput } from '@timeapp/api-client';
import { useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export default function NewRoutineScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const api = routineApiClient({ baseUrl: API_BASE_URL, getToken: () => token });

  return (
    <RoutineForm
      title="ルーティン作成"
      onSubmit={async (input: CreateRoutineInput) => {
        await api.create(input);
        router.back();
      }}
    />
  );
}
