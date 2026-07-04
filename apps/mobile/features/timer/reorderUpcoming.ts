import type { ExerciseGroup } from '@timeapp/core';
import type { Routine } from '@timeapp/core';

export function reorderUpcoming(
  routine: Routine,
  currentGroupEnd: number,
  newUpcomingGroups: ExerciseGroup[],
): Routine {
  const keepItems = routine.items.slice(0, currentGroupEnd + 1);
  const reorderedItems = newUpcomingGroups.flatMap((g) =>
    routine.items.slice(g.itemStart, g.itemEnd + 1)
  );
  return { ...routine, items: [...keepItems, ...reorderedItems] };
}
