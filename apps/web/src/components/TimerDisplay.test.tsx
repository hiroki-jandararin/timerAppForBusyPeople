import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRoutine } from '@timeapp/core';
import { addItem, updateItem, addWorkoutSet } from '@timeapp/core';
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

  it('現在のworkout種目のとき後回しボタンが表示される', () => {
    const routine = createGroupedRoutine();

    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        state={{ ...initialTimerState, status: 'running', currentIndex: 0 }}
      />,
    );

    expect(screen.getByRole('button', { name: '後回し' })).toBeInTheDocument();
  });

  it('現在が休憩（interval）のとき後回しボタンが表示されない', () => {
    const routine = createGroupedRoutine();
    // index 1 は休憩
    render(
      <TimerDisplay
        {...defaultProps}
        routine={routine}
        state={{ ...initialTimerState, status: 'running', currentIndex: 1 }}
      />,
    );

    expect(screen.queryByRole('button', { name: '後回し' })).not.toBeInTheDocument();
  });

  it('後回しボタンを押すと確認ダイアログが表示され onDefer はまだ呼ばれない', async () => {
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

    // ベンチプレスグループの開始インデックス = 4（スクワット3セット+休憩3件=6アイテム?）
    // createGroupedRoutine: スクワット×3(includeLastInterval:true) → [W,I,W,I,W,I] = 6アイテム
    // ベンチプレス×2(includeLastInterval:false) → [W,I,W] = 3アイテム
    // ベンチプレスの開始インデックス = 6
    expect(onDoNext).toHaveBeenCalledWith(6);
  });
});
