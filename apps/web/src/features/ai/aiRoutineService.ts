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
    body: JSON.stringify({ prompt, targetSec: targetDurationSec }),
  });

  if (!res.ok) throw new Error(`ルーティンの生成に失敗しました: ${res.status}`);

  const generated: GeneratedRoutine = await res.json();
  return toRoutine(generated, targetDurationSec);
}

function toGroupBase(title: string): string {
  let base = title.replace(/\s*\d+回$/, '').trim();  // "スクワット 10回" → "スクワット"
  base = base.replace(/\s+\d+$/, '').trim();           // "スクワット 1" → "スクワット"
  base = base.replace(/（[^）]*）$/, '').trim();         // "ダンベルカール（右）" → "ダンベルカール"
  return base;
}

export function assignGroupIds(items: Array<{ title: string; type: string }>): string[] {
  const result: string[] = [];
  let currentBase: string | null = null;
  let currentGroupId: string | null = null;

  for (const item of items) {
    if (item.type === 'workout') {
      const base = toGroupBase(item.title);
      if (base !== currentBase) {
        currentBase = base;
        currentGroupId = `group_${crypto.randomUUID()}`;
      }
      result.push(currentGroupId!);
    } else {
      result.push(currentGroupId ?? `group_${crypto.randomUUID()}`);
    }
  }

  return result;
}

function toRoutine(generated: GeneratedRoutine, targetDurationSec?: number): Routine {
  const routine = createRoutine(generated.name);
  routine.targetDurationSec = targetDurationSec ?? null;
  const groupIds = assignGroupIds(generated.items);
  routine.items = generated.items.map((item, i) => ({
    id: `item_${crypto.randomUUID()}`,
    type: item.type,
    title: item.title,
    durationSec: item.durationSec,
    voiceText: '',
    groupId: groupIds[i],
  }));
  return routine;
}
