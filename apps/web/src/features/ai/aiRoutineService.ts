import { createRoutine } from '@timeapp/core';
import type { Routine } from '@timeapp/core';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

type GeneratedItem = {
  title: string;
  type: 'workout' | 'interval';
  durationSec: number;
};

type GeneratedRoutine = {
  name: string;
  items: GeneratedItem[];
};

export async function generateAiRoutine(
  prompt: string,
  getToken: () => Promise<string>,
  targetDurationSec?: number,
): Promise<Routine> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/ai/generate-routine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) throw new Error(`ルーティンの生成に失敗しました: ${res.status}`);

  const generated: GeneratedRoutine = await res.json();
  return toRoutine(generated, targetDurationSec);
}

function toRoutine(generated: GeneratedRoutine, targetDurationSec?: number): Routine {
  const routine = createRoutine(generated.name);
  routine.targetDurationSec = targetDurationSec ?? null;
  routine.items = generated.items.map((item) => ({
    id: `item_${crypto.randomUUID()}`,
    type: item.type,
    title: item.title,
    durationSec: item.durationSec,
    voiceText: '',
  }));
  return routine;
}
