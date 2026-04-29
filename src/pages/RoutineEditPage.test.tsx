import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRoutine } from '../features/routines/routineFactory';
import { RoutineEditPage } from './RoutineEditPage';

describe('RoutineEditPage', () => {
  it('編集画面でカードを追加できる', async () => {
    const user = userEvent.setup();

    render(<RoutineEditPage routine={createRoutine('A')} onSave={vi.fn()} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'ワークアウト追加' }));

    expect(screen.getByText('1. ワークアウト')).toBeInTheDocument();
  });

  it('保存ボタンでルーティンが保存される', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<RoutineEditPage routine={createRoutine('A')} onSave={onSave} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'ワークアウト追加' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].items).toHaveLength(1);
  });
});
