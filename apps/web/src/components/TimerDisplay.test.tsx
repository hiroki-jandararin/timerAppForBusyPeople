import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRoutine } from '@timeapp/core';
import { addItem, updateItem, addWorkoutSet, addPairedWorkoutSet } from '@timeapp/core';
import { initialTimerState } from '@timeapp/core';
import { TimerDisplay } from './TimerDisplay';

function createLongRoutine() {
  let routine = createRoutine('Long');
  for (let i = 0; i < 7; i++) {
    routine = addItem(routine, 'workout');
    routine = updateItem(routine, routine.items[i].id, { title: `種目${i + 1}`, durationSec: 30 });
  }
  return routine;
}

function createPairedRoutine() {
  return addPairedWorkoutSet(createRoutine('Paired'), {
    title: 'ダンベルカール',
    setCount: 3,
    workoutDurationSec: 60,
    intervalDurationSec: 30,
    includeLastInterval: true,
  });
}

function createGroupedRoutine() {
  // スクワット×3 + 種目間休憩 + ベンチプレス×2
  let routine = addWorkoutSet(createRoutine('Grouped'), {
    title: 'スクワット',
    setCount: 3,
    workoutDurationSec: 30,
    intervalDurationSec: 20,
    includeLastInterval: true,
  });
  routine = addWorkoutSet(routine, {
    title: 'ベンチプレス',
    setCount: 2,
    workoutDurationSec: 30,
    intervalDurationSec: 20,
    includeLastInterval: false,
  });
  return routine;
}

const defaultProps = {
  plannedEndLabel: '12:00',
  scheduleDeltaLabel: '開始前',
  scheduleDeltaSec: 0,
  onPrevious: vi.fn(),
  onNext: vi.fn(),
  onDefer: vi.fn(),
  onDoNext: vi.fn(),
  controls: null,
};

describe('TimerDisplay', () => {
  it('QUEUEに全種目が表示される', () => {
    const routine = createLongRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        state={{ ...initialTimerState, currentIndex: 3 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    for (let i = 1; i <= 7; i++) {
      expect(queue).toHaveTextContent(`種目${i}`);
    }
  });

  it('複数セット種目はグループ行にまとめて表示される', () => {
    const routine = createGroupedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        state={{ ...initialTimerState, currentIndex: 0 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    expect(queue).toHaveTextContent('スクワット');
    expect(queue).toHaveTextContent('× 3');
    expect(queue).toHaveTextContent('ベンチプレス');
    expect(queue).toHaveTextContent('× 2');
    // 休憩の内訳サブテキストが表示される（1セットごとに休憩が入るサイクル形式）
    expect(queue).toHaveTextContent('(30秒 ＋ 休憩 20秒) × 3');
    expect(queue).toHaveTextContent('(30秒 ＋ 休憩 20秒) × 2');
    // 個別のセット行が存在しないこと
    expect(queue).not.toHaveTextContent('スクワット 1');
    expect(queue).not.toHaveTextContent('スクワット 2');
  });

  it('タイマー開始前（idle）でも現在グループをタップすると後回しボタンが表示される', async () => {
    const user = userEvent.setup();
    const routine = createGroupedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        state={{ ...initialTimerState, status: 'idle', currentIndex: 0 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    const currentRow = Array.from(queue.querySelectorAll('[data-group]')).find((el) =>
      el.textContent?.includes('スクワット'),
    );
    await user.click(currentRow as Element);

    expect(screen.getByRole('button', { name: '後回し' })).toBeInTheDocument();
  });

  it('現在のworkout種目のとき QUEUEの現在グループをタップすると後回しボタンが表示される', async () => {
    const user = userEvent.setup();
    const routine = createGroupedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        state={{ ...initialTimerState, status: 'running', currentIndex: 0 }}
      />,
    );

    // タップ前は表示されない
    expect(screen.queryByRole('button', { name: '後回し' })).not.toBeInTheDocument();

    // 現在グループ行をタップ
    const queue = screen.getByRole('region', { name: '現在の位置' });
    const currentRow = Array.from(queue.querySelectorAll('[data-group]')).find((el) =>
      el.textContent?.includes('スクワット'),
    );
    await user.click(currentRow as Element);

    expect(screen.getByRole('button', { name: '後回し' })).toBeInTheDocument();
  });

  it('現在が休憩（interval）のとき現在グループをタップしても後回しボタンが表示されない', async () => {
    const user = userEvent.setup();
    const routine = createGroupedRoutine();
    // index 1 は休憩
    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        state={{ ...initialTimerState, status: 'running', currentIndex: 1 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    const currentRow = Array.from(queue.querySelectorAll('[data-group]')).find((el) =>
      el.textContent?.includes('スクワット'),
    );
    if (currentRow) await user.click(currentRow as Element);

    expect(screen.queryByRole('button', { name: '後回し' })).not.toBeInTheDocument();
  });

  it('QUEUEの現在グループをタップして後回しボタンを押すと確認ダイアログが表示され onDefer はまだ呼ばれない', async () => {
    const user = userEvent.setup();
    const onDefer = vi.fn();
    const routine = createGroupedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        onDefer={onDefer}
        state={{ ...initialTimerState, status: 'running', currentIndex: 0 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    const currentRow = Array.from(queue.querySelectorAll('[data-group]')).find((el) =>
      el.textContent?.includes('スクワット'),
    );
    await user.click(currentRow as Element);
    await user.click(screen.getByRole('button', { name: '後回し' }));
    expect(screen.getByRole('dialog', { name: '後回しにしますか？' })).toBeInTheDocument();
    expect(onDefer).not.toHaveBeenCalled();
  });

  it('確認ダイアログで「後回しにする」を押すと onDefer が呼ばれる', async () => {
    const user = userEvent.setup();
    const onDefer = vi.fn();
    const routine = createGroupedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        onDefer={onDefer}
        state={{ ...initialTimerState, status: 'running', currentIndex: 0 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    const currentRow = Array.from(queue.querySelectorAll('[data-group]')).find((el) =>
      el.textContent?.includes('スクワット'),
    );
    await user.click(currentRow as Element);
    await user.click(screen.getByRole('button', { name: '後回し' }));
    await user.click(screen.getByRole('button', { name: '後回しにする' }));
    expect(onDefer).toHaveBeenCalledOnce();
  });

  it('未来グループをタップすると「次にやる」ボタンが表示される', async () => {
    const user = userEvent.setup();
    const routine = createGroupedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        state={{ ...initialTimerState, status: 'running', currentIndex: 0 }}
      />,
    );

    // ベンチプレスグループ行をタップ
    const queue = screen.getByRole('region', { name: '現在の位置' });
    const benchRow = Array.from(queue.querySelectorAll('[data-group]')).find((el) =>
      el.textContent?.includes('ベンチプレス'),
    );
    expect(benchRow).toBeTruthy();
    await user.click(benchRow as Element);

    expect(screen.getByRole('button', { name: '次にやる' })).toBeInTheDocument();
  });

  it('「次にやる」ボタンを押すと確認ダイアログが表示され onDoNext はまだ呼ばれない', async () => {
    const user = userEvent.setup();
    const onDoNext = vi.fn();
    const routine = createGroupedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        onDoNext={onDoNext}
        state={{ ...initialTimerState, status: 'running', currentIndex: 0 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    const benchRow = Array.from(queue.querySelectorAll('[data-group]')).find((el) =>
      el.textContent?.includes('ベンチプレス'),
    );
    await user.click(benchRow as Element);
    await user.click(screen.getByRole('button', { name: '次にやる' }));

    expect(screen.getByRole('dialog', { name: 'この順番にしますか？' })).toBeInTheDocument();
    expect(onDoNext).not.toHaveBeenCalled();
  });

  it('ペア種目はグループラベルが（右/左）になりサブテキストが正しい', () => {
    const routine = createPairedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        state={{ ...initialTimerState, currentIndex: 0 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    expect(queue).toHaveTextContent('ダンベルカール（右/左）');
    expect(queue).toHaveTextContent('× 3');
    expect(queue).toHaveTextContent('(1分 ＋ 1分 ＋ 休憩 30秒) × 3');
  });

  it('「次にやる」ボタンを押すと onDoNext がグループ開始インデックスで呼ばれる', async () => {
    const user = userEvent.setup();
    const onDoNext = vi.fn();
    const routine = createGroupedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        onDoNext={onDoNext}
        state={{ ...initialTimerState, status: 'running', currentIndex: 0 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    const benchRow = Array.from(queue.querySelectorAll('[data-group]')).find((el) =>
      el.textContent?.includes('ベンチプレス'),
    );
    await user.click(benchRow as Element);
    await user.click(screen.getByRole('button', { name: '次にやる' }));
    await user.click(screen.getByRole('button', { name: '次にやる' })); // 確認ダイアログで確定

    // createGroupedRoutine: スクワット×3(includeLastInterval:true) → [W,I,W,I,W,I] = 6アイテム
    // ベンチプレスの開始インデックス = 6
    expect(onDoNext).toHaveBeenCalledWith(6);
  });

  it('onDoNext が渡されると QUEUE にヒントテキストが表示される', () => {
    render(
      <TimerDisplay
        {...defaultProps}
        routine={createGroupedRoutine()}
        state={{ ...initialTimerState, currentIndex: 0 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    expect(queue).toHaveTextContent('タップして順番変更');
  });

  it('onDoNext が渡されない場合ヒントテキストは表示されない', () => {
    const { onDoNext: _, ...propsWithoutDoNext } = defaultProps;

    render(
      <TimerDisplay
        {...propsWithoutDoNext}
        routine={createGroupedRoutine()}
        state={{ ...initialTimerState, currentIndex: 0 }}
      />,
    );

    const queue = screen.getByRole('region', { name: '現在の位置' });
    expect(queue).not.toHaveTextContent('タップして順番変更');
  });

  it('onDoNext が渡されると upcoming グループにドラッグハンドルが表示される', () => {
    render(
      <TimerDisplay
        {...defaultProps}
        routine={createGroupedRoutine()}
        state={{ ...initialTimerState, currentIndex: 0 }}
      />,
    );

    const handles = screen.getAllByRole('img', { name: '並び替え可能' });
    expect(handles.length).toBeGreaterThan(0);
  });

  it('onDoNext が渡されない場合ドラッグハンドルは表示されない', () => {
    const { onDoNext: _, ...propsWithoutDoNext } = defaultProps;

    render(
      <TimerDisplay
        {...propsWithoutDoNext}
        routine={createGroupedRoutine()}
        state={{ ...initialTimerState, currentIndex: 0 }}
      />,
    );

    expect(screen.queryAllByRole('img', { name: '並び替え可能' })).toHaveLength(0);
  });
});
