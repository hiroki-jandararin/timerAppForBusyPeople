import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRoutine } from '@timeapp/core';
import { addItem, updateItem, addWorkoutSet } from '@timeapp/core';
import { MockVoiceService } from '../features/voice/mockVoiceService';
import type { WakeLockService } from '@timeapp/core';
import { TimerPage } from './TimerPage';

const wakeLockService: WakeLockService = {
  request: vi.fn().mockResolvedValue(undefined),
  release: vi.fn().mockResolvedValue(undefined),
};

function createTimerRoutine() {
  let routine = addItem(createRoutine('A'), 'workout');
  routine = updateItem(routine, routine.items[0].id, { title: 'スクワット', durationSec: 30 });
  return routine;
}

function createWorkoutAndRestRoutine() {
  let routine = createTimerRoutine();
  routine = addItem(routine, 'interval');
  routine = updateItem(routine, routine.items[1].id, { title: '休憩', durationSec: 20 });
  routine = addItem(routine, 'workout');
  routine = updateItem(routine, routine.items[2].id, { title: '腕立て伏せ', durationSec: 30 });
  return routine;
}

function createRoutineWithMultipleRests() {
  let routine = createTimerRoutine();
  routine = addItem(routine, 'interval');
  routine = updateItem(routine, routine.items[1].id, { title: '休憩', durationSec: 90 });
  routine = addItem(routine, 'workout');
  routine = updateItem(routine, routine.items[2].id, { title: '腕立て伏せ', durationSec: 30 });
  routine = addItem(routine, 'interval');
  routine = updateItem(routine, routine.items[3].id, { title: '休憩', durationSec: 30 });
  routine = addItem(routine, 'workout');
  routine = updateItem(routine, routine.items[4].id, { title: '腹筋', durationSec: 30 });
  return routine;
}

describe('TimerPage', () => {
  it('開始前は最初のカードの秒数を表示する', () => {
    render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    expect(screen.getAllByText('スクワット')).not.toHaveLength(0);
    expect(screen.getByLabelText('残り時間')).toHaveTextContent('0:30');
    expect(screen.getByText(/終了予定/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '次の種目へ移動' })).toBeInTheDocument();
    expect(screen.getByText('開始前')).toBeInTheDocument();
  });

  it('タイマー画面で現在の種目名と残り秒数が表示される', async () => {
    const user = userEvent.setup();

    render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '開始' }));
    expect(screen.getAllByText('READY').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('残り時間')).toHaveTextContent('0:03');
  });

  it('開始直後はカウントダウン中の表示に変わる', async () => {
    const user = userEvent.setup();

    render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '開始' }));

    expect(screen.getByRole('button', { name: 'カウントダウン' })).toBeDisabled();
  });

  it('ワークアウト完了後は終了ボタンが表示されない', async () => {
    vi.useFakeTimers();

    try {
      render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: '開始' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(34000);
      });

      expect(screen.queryByRole('button', { name: '終了' })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('終了後は終了予定時刻ではなく実際の終了時刻を表示する', () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(2026, 0, 1, 12, 34, 0));
      render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: '開始' }));
      vi.setSystemTime(new Date(2026, 0, 1, 12, 35, 0));
      fireEvent.click(screen.getByRole('button', { name: '終了' }));

      expect(screen.getByText(/終了 \d{1,2}:\d{2}/)).toHaveTextContent('12:35');
      expect(screen.queryByText(/終了予定/)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('休憩中は休憩終了までの残り時間と次の種目を強く表示する', async () => {
    vi.useFakeTimers();

    try {
      render(<TimerPage routine={createWorkoutAndRestRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: '開始' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3100);
      });
      fireEvent.click(screen.getByRole('button', { name: '次の種目へ移動' }));

      expect(screen.getByLabelText('休憩終了までの残り時間')).toHaveTextContent('0:20');
      expect(screen.queryByText('休憩終了まで 20秒')).not.toBeInTheDocument();
      expect(screen.getByText('30秒早い')).toBeInTheDocument();
      expect(screen.getAllByText('腕立て伏せ')).not.toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('60秒以上遅れたら休憩短縮を確認し、適用するとこの先の休憩を同じ割合で短くする', async () => {
    vi.useFakeTimers();

    try {
      render(<TimerPage routine={createRoutineWithMultipleRests()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: '開始' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3100);
      });
      fireEvent.click(screen.getByRole('button', { name: '一時停止' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });

      expect(screen.getByRole('dialog', { name: 'この先の休憩を短縮しますか？' })).toBeInTheDocument();
      expect(screen.getByText('休憩短縮')).toBeInTheDocument();
      expect(screen.getByText(/休憩を合計60秒短縮できます/)).toBeInTheDocument();
      expect(screen.getByText('この先の休憩2件を同じ割合で短くします。')).toBeInTheDocument();
      expect(screen.getByText('90秒 → 45秒（-45秒）')).toBeInTheDocument();
      expect(screen.getByText('30秒 → 15秒（-15秒）')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '休憩を短縮する' }));

      expect(screen.getByRole('button', { name: '一時停止' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '再開' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '次の種目へ移動' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByLabelText('休憩終了までの残り時間')).toHaveTextContent('0:45');

      fireEvent.click(screen.getByRole('button', { name: '次の種目へ移動' }));
      fireEvent.click(screen.getByRole('button', { name: '次の種目へ移動' }));

      expect(screen.getByLabelText('休憩終了までの残り時間')).toHaveTextContent('0:15');
    } finally {
      vi.useRealTimers();
    }
  });

  it('後回しボタンを押すと現在グループが末尾に移動して次へ進む', async () => {
    const user = userEvent.setup();
    // スクワット×2 + 種目間休憩 + ベンチプレス×1
    let routine = addWorkoutSet(createRoutine('Test'), {
      title: 'スクワット',
      setCount: 2,
      workoutDurationSec: 30,
      intervalDurationSec: 20,
      includeLastInterval: true,
    });
    routine = addWorkoutSet(routine, {
      title: 'ベンチプレス',
      setCount: 1,
      workoutDurationSec: 30,
      intervalDurationSec: 20,
      includeLastInterval: false,
    });

    render(
      <TimerPage
        routine={routine}
        voiceService={new MockVoiceService()}
        wakeLockService={wakeLockService}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '開始' }));
    await user.click(screen.getByRole('button', { name: '後回し' }));
    await user.click(screen.getByRole('button', { name: '後回しにする' }));

    // ベンチプレスが現在の種目になる
    expect(screen.getAllByText('ベンチプレス').length).toBeGreaterThan(0);

    // QUEUEでスクワットが最後のグループになっている
    const queue = screen.getByRole('region', { name: '現在の位置' });
    const groups = Array.from(queue.querySelectorAll('[data-group]'));
    expect(groups[groups.length - 1]?.textContent).toContain('スクワット');
  });

  it('次にやるでQUEUEの未来グループが現在の直後に移動する', async () => {
    const user = userEvent.setup();
    let routine = addWorkoutSet(createRoutine('Test'), {
      title: 'スクワット',
      setCount: 1,
      workoutDurationSec: 30,
      intervalDurationSec: 20,
      includeLastInterval: true,
    });
    routine = addWorkoutSet(routine, {
      title: 'ベンチプレス',
      setCount: 1,
      workoutDurationSec: 30,
      intervalDurationSec: 20,
      includeLastInterval: true,
    });
    routine = addWorkoutSet(routine, {
      title: '懸垂',
      setCount: 1,
      workoutDurationSec: 30,
      intervalDurationSec: 20,
      includeLastInterval: false,
    });

    render(
      <TimerPage
        routine={routine}
        voiceService={new MockVoiceService()}
        wakeLockService={wakeLockService}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '開始' }));

    // 懸垂グループ行をタップして「次にやる」
    const queue = screen.getByRole('region', { name: '現在の位置' });
    const kenkuRow = Array.from(queue.querySelectorAll('[data-group]')).find((el) =>
      el.textContent?.includes('懸垂'),
    );
    await user.click(kenkuRow as Element);
    await user.click(screen.getByRole('button', { name: '次にやる' }));

    // QUEUEの2番目グループが懸垂になっている
    const updatedGroups = Array.from(
      screen.getByRole('region', { name: '現在の位置' }).querySelectorAll('[data-group]'),
    );
    expect(updatedGroups[1]?.textContent).toContain('懸垂');
  });
});
