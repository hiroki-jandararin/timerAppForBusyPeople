import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRoutine } from '@timeapp/core';
import { addItem } from '@timeapp/core';
import { RoutineListPage } from './RoutineListPage';

describe('RoutineListPage', () => {
  it('ルーティン一覧に保存済みルーティンが表示され、新規作成ボタンが表示される', () => {
    const routine = { ...addItem(createRoutine('全身トレA'), 'workout'), targetDurationSec: 60 };

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
    expect(screen.getByText('予定時間')).toBeInTheDocument();
    expect(screen.getByText('0:30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '＋ 新規' })).toBeInTheDocument();
  });

  it('onDeleteAccountが渡されたときアカウント削除ボタンが表示される', () => {
    render(
      <RoutineListPage
        routines={[]}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onSignOut={vi.fn()}
        onDeleteAccount={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'アカウント削除' })).toBeInTheDocument();
  });

  it('アカウント削除ボタンをクリックして確認するとonDeleteAccountが呼ばれる', async () => {
    const user = userEvent.setup();
    const onDeleteAccount = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <RoutineListPage
        routines={[]}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onSignOut={vi.fn()}
        onDeleteAccount={onDeleteAccount}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'アカウント削除' }));

    expect(onDeleteAccount).toHaveBeenCalledOnce();
  });

  it('アカウント削除ボタンをキャンセルするとonDeleteAccountが呼ばれない', async () => {
    const user = userEvent.setup();
    const onDeleteAccount = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <RoutineListPage
        routines={[]}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onSignOut={vi.fn()}
        onDeleteAccount={onDeleteAccount}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'アカウント削除' }));

    expect(onDeleteAccount).not.toHaveBeenCalled();
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
