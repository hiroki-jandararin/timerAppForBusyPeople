import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRoutine } from '../features/routines/routineFactory';
import { addItem, updateItem } from '../features/routines/routineOperations';
import { MockVoiceService } from '../features/voice/mockVoiceService';
import type { WakeLockService } from '../features/wakeLock/wakeLockService';
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

describe('TimerPage', () => {
  it('開始前は最初のカードの秒数を表示する', () => {
    render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    expect(screen.getAllByText('スクワット')).not.toHaveLength(0);
    expect(screen.getByLabelText('残り秒数')).toHaveTextContent('30');
    expect(screen.getByText(/終了 /)).toBeInTheDocument();
    expect(screen.getByText('今すぐ')).toBeInTheDocument();
    expect(screen.getByText('次')).toBeInTheDocument();
    expect(screen.getByText('開始ボタンを押す')).toBeInTheDocument();
    expect(screen.getByText('開始前')).toBeInTheDocument();
  });

  it('タイマー画面で現在の種目名と残り秒数が表示される', async () => {
    const user = userEvent.setup();

    render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '開始' }));
    expect(screen.getByText('開始まで')).toBeInTheDocument();
    expect(screen.getByLabelText('残り秒数')).toHaveTextContent('3');
    expect(screen.getByText('スクワットの準備')).toBeInTheDocument();
  });

  it('開始直後はカウントダウン中の表示に変わる', async () => {
    const user = userEvent.setup();

    render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '開始' }));

    expect(screen.getByRole('button', { name: 'カウントダウン' })).toBeDisabled();
  });

  it('休憩中は休憩終了までの残り時間と次の種目を強く表示する', async () => {
    const user = userEvent.setup();

    render(<TimerPage routine={createWorkoutAndRestRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '開始' }));
    await new Promise((resolve) => window.setTimeout(resolve, 3100));
    await user.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.getByLabelText('休憩終了までの残り秒数')).toHaveTextContent('20');
    expect(screen.queryByText('休憩終了まで 20秒')).not.toBeInTheDocument();
    expect(screen.getByText('腕立て伏せに備える')).toBeInTheDocument();
    expect(screen.getByText('30秒早い')).toBeInTheDocument();
    expect(screen.getAllByText('腕立て伏せ')).not.toHaveLength(0);
  }, 10000);
});
