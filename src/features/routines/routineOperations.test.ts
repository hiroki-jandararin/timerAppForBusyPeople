import { describe, expect, it } from 'vitest';
import { addItem, deleteItem, duplicateItem, duplicateRoutine, moveItemDown, moveItemUp, renameRoutine, updateItem, validateRoutine } from './routineOperations';
import { createRoutine } from './routineFactory';

describe('routine operations', () => {
  it('新規ルーティンを作成できる', () => {
    const routine = createRoutine('全身トレA');

    expect(routine.name).toBe('全身トレA');
    expect(routine.items).toEqual([]);
  });

  it('ルーティン名を変更できる', () => {
    const routine = renameRoutine(createRoutine('A'), 'B');

    expect(routine.name).toBe('B');
  });

  it('ルーティンを複製でき、routineとitemsのidが新しくなる', () => {
    const source = addItem(addItem(createRoutine('A'), 'workout'), 'interval');
    const duplicated = duplicateRoutine(source);

    expect(duplicated.name).toBe('A コピー');
    expect(duplicated.id).not.toBe(source.id);
    expect(duplicated.items).toHaveLength(2);
    expect(duplicated.items[0].id).not.toBe(source.items[0].id);
    expect(duplicated.items[1].id).not.toBe(source.items[1].id);
  });

  it('ワークアウトカードとインターバルカードを追加できる', () => {
    const routine = addItem(addItem(createRoutine(), 'workout'), 'interval');

    expect(routine.items.map((item) => item.type)).toEqual(['workout', 'interval']);
  });

  it('カードを削除できる', () => {
    const routine = addItem(addItem(createRoutine(), 'workout'), 'interval');
    const updated = deleteItem(routine, routine.items[0].id);

    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].type).toBe('interval');
  });

  it('カードを複製できる', () => {
    const routine = addItem(createRoutine(), 'workout');
    const duplicated = duplicateItem(routine, routine.items[0].id);

    expect(duplicated.items).toHaveLength(2);
    expect(duplicated.items[1].title).toBe(duplicated.items[0].title);
    expect(duplicated.items[1].id).not.toBe(duplicated.items[0].id);
  });

  it('カードを上に移動できる', () => {
    const routine = addItem(addItem(createRoutine(), 'workout'), 'interval');
    const moved = moveItemUp(routine, routine.items[1].id);

    expect(moved.items.map((item) => item.type)).toEqual(['interval', 'workout']);
  });

  it('カードを下に移動できる', () => {
    const routine = addItem(addItem(createRoutine(), 'workout'), 'interval');
    const moved = moveItemDown(routine, routine.items[0].id);

    expect(moved.items.map((item) => item.type)).toEqual(['interval', 'workout']);
  });

  it('先頭カードを上に移動しても順番は変わらない', () => {
    const routine = addItem(addItem(createRoutine(), 'workout'), 'interval');

    expect(moveItemUp(routine, routine.items[0].id).items).toEqual(routine.items);
  });

  it('末尾カードを下に移動しても順番は変わらない', () => {
    const routine = addItem(addItem(createRoutine(), 'workout'), 'interval');

    expect(moveItemDown(routine, routine.items[1].id).items).toEqual(routine.items);
  });

  it('durationSecにプリセット値を設定できる', () => {
    const routine = addItem(createRoutine(), 'workout');
    const updated = updateItem(routine, routine.items[0].id, { durationSec: 45 });

    expect(updated.items[0].durationSec).toBe(45);
  });

  it('同じ名前のルーティンは検出できる', () => {
    const routine = createRoutine('A');
    const errors = validateRoutine(routine, [createRoutine('A')]);

    expect(errors).toContain('同じ名前のルーティンは追加できません');
  });
});
