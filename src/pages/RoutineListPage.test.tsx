import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRoutine } from '../features/routines/routineFactory';
import { addItem } from '../features/routines/routineOperations';
import { RoutineListPage } from './RoutineListPage';

describe('RoutineListPage', () => {
  it('ルーティン一覧に保存済みルーティンが表示され、新規作成ボタンが表示される', () => {
    const routine = addItem(createRoutine('全身トレA'), 'workout');

    render(
      <RoutineListPage
        routines={[routine]}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('全身トレA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '＋ 新規' })).toBeInTheDocument();
  });

  it('空状態で最初のルーティンを作成できる', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <RoutineListPage
        routines={[]}
        onCreate={onCreate}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '最初のルーティンを作成' }));

    expect(onCreate).toHaveBeenCalledOnce();
  });
});
