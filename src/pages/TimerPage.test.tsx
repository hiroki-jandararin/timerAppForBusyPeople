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

describe('TimerPage', () => {
  it('開始前は最初のカードの秒数を表示する', () => {
    render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'スクワット' })).toBeInTheDocument();
    expect(screen.getByLabelText('残り秒数')).toHaveTextContent('30');
  });

  it('タイマー画面で現在の種目名と残り秒数が表示される', async () => {
    const user = userEvent.setup();

    render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '開始' }));
    expect(screen.getByText('開始まで')).toBeInTheDocument();
    expect(screen.getByLabelText('残り秒数')).toHaveTextContent('3');
    expect(screen.getByText('最初: スクワット')).toBeInTheDocument();
  });

  it('開始直後はカウントダウン中の表示に変わる', async () => {
    const user = userEvent.setup();

    render(<TimerPage routine={createTimerRoutine()} voiceService={new MockVoiceService()} wakeLockService={wakeLockService} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '開始' }));

    expect(screen.getByRole('button', { name: 'カウントダウン' })).toBeDisabled();
  });
});
