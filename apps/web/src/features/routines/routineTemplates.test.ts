import { describe, expect, it } from 'vitest';
import { createRoutineFromTemplate, ROUTINE_TEMPLATES, type RoutineTemplate } from '@timeapp/core';

describe('routineTemplates', () => {
  it('全身トレーニングのテンプレートは初期テンプレート一覧に含めない', () => {
    expect(ROUTINE_TEMPLATES.some((template) => template.name === '全身トレーニング')).toBe(false);
  });

  it('テンプレートからルーティンを作成できる', () => {
    const template: RoutineTemplate = {
      id: 'short-workout',
      name: '短時間トレーニング',
      items: [
        {
          type: 'workout',
          title: 'スクワット',
          durationSec: 30,
        },
        {
          type: 'interval',
          title: '休憩',
          durationSec: 15,
        },
      ],
    };

    const routine = createRoutineFromTemplate(template, new Date('2026-01-01T00:00:00.000Z'));

    expect(routine).toMatchObject({
      name: '短時間トレーニング',
      targetDurationSec: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(routine.items).toHaveLength(2);
    expect(routine.items[0]).toMatchObject({
      type: 'workout',
      title: 'スクワット',
      durationSec: 30,
      voiceText: '',
    });
  });
});
