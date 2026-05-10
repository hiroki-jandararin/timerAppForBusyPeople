import { createRoutine } from './routineFactory';
import type { Routine, RoutineItem, RoutineItemType } from './routineTypes';

export type RoutineTemplate = {
  id: string;
  name: string;
  items: Array<{
    type: RoutineItemType;
    title: string;
    durationSec: number;
    voiceText?: string;
  }>;
};

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [];

export function createRoutineFromTemplate(template: RoutineTemplate, now = new Date()): Routine {
  const routine = createRoutine(template.name, now);
  return {
    ...routine,
    items: template.items.map((item) => createTemplateItem(item)),
  };
}

function createTemplateItem(templateItem: RoutineTemplate['items'][number]): RoutineItem {
  return {
    id: `item_${crypto.randomUUID()}`,
    type: templateItem.type,
    title: templateItem.title,
    durationSec: templateItem.durationSec,
    voiceText: templateItem.voiceText ?? '',
  };
}
