import RoutineForm from '@/components/RoutineForm';
import { useAuth } from '@/contexts/AuthContext';
import { routineApiClient, type CreateRoutineInput } from '@timeapp/api-client';
import type { Routine } from '@timeapp/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export default function EditRoutineScreen() {
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);

  const api = routineApiClient({ baseUrl: API_BASE_URL, getToken: () => token });

  useEffect(() => {
    api.getById(id).then(setRoutine);
  }, [id]);

  if (!routine) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  return (
    <RoutineForm
      title="ルーティン編集"
      initialValues={routine}
      onSubmit={async (input: CreateRoutineInput) => {
        await api.update(id, input);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
});
