import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRoutine } from '@timeapp/core';
import type { Routine } from '@timeapp/core';
import { RoutineEditPage } from './RoutineEditPage';

describe('RoutineEditPage', () => {
  it('予定時間、目標時間、差分を表示できる', async () => {
    const user = userEvent.setup();

    render(
      <RoutineEditPage
        routine={createRoutine('A')}
        existingRoutines={[]}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // ワークアウト追加は種目ピッカーを開く → 空白で追加でアイテムを追加
    await user.click(screen.getByRole('button', { name: 'ワークアウト追加' }));
    await user.click(screen.getByRole('button', { name: '＋ 空白で追加' }));
    await user.type(screen.getByLabelText('目標筋トレ時間（分）'), '1');

    expect(screen.getByText('予定時間')).toBeInTheDocument();
    expect(screen.getByText('0:30')).toBeInTheDocument();
    expect(screen.getByText('30秒余裕')).toBeInTheDocument();
  });

  it('編集画面でカードを追加できる', async () => {
    const user = userEvent.setup();

    render(
      <RoutineEditPage
        routine={createRoutine('A')}
        existingRoutines={[]}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'ワークアウト追加' }));
    await user.click(screen.getByRole('button', { name: '＋ 空白で追加' }));

    expect(screen.getByText('1. ワークアウト')).toBeInTheDocument();
  });

  it('保存ボタンでルーティンが保存される', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <RoutineEditPage
        routine={createRoutine('A')}
        existingRoutines={[]}
        onSave={onSave}
        onBack={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'ワークアウト追加' }));
    await user.click(screen.getByRole('button', { name: '＋ 空白で追加' }));
    await user.click(screen.getAllByRole('button', { name: '保存' })[0]);

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].items).toHaveLength(1);
  });

  it('セットを一括追加して保存できる', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <RoutineEditPage
        routine={createRoutine('A')}
        existingRoutines={[]}
        onSave={onSave}
        onBack={vi.fn()}
      />
    );

    // セット一括追加フォームはデフォルトで開いている
    await user.clear(screen.getByLabelText('種目名'));
    await user.type(screen.getByLabelText('種目名'), 'スクワット');
    await user.clear(screen.getByLabelText('回数'));
    await user.click(screen.getByRole('button', { name: 'セットを追加' }));
    await user.click(screen.getAllByRole('button', { name: '保存' })[0]);

    expect(onSave).toHaveBeenCalledOnce();
    expect(
      onSave.mock.calls[0][0].items.map((item: { type: string; title: string }) => [
        item.type,
        item.title,
      ])
    ).toEqual([
      ['workout', 'スクワット 1'],
      ['interval', '休憩'],
      ['workout', 'スクワット 2'],
      ['interval', '休憩'],
      ['workout', 'スクワット 3'],
    ]);
  });

  it('セット一括追加の秒数入力は空にでき、再入力しても先頭に0が残らない', async () => {
    const user = userEvent.setup();

    render(
      <RoutineEditPage
        routine={createRoutine('A')}
        existingRoutines={[]}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // セット一括追加フォームはデフォルトで開いている
    const workoutDurationInput = screen.getByLabelText('ワークアウト秒数') as HTMLInputElement;
    const intervalDurationInput = screen.getByLabelText('休憩秒数') as HTMLInputElement;

    await user.clear(workoutDurationInput);
    await user.clear(intervalDurationInput);

    expect(workoutDurationInput.value).toBe('');
    expect(intervalDurationInput.value).toBe('');

    await user.type(workoutDurationInput, '45');
    await user.type(intervalDurationInput, '30');

    expect(workoutDurationInput.value).toBe('45');
    expect(intervalDurationInput.value).toBe('30');
  });

  it('同じ名前のルーティンは保存できない', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <RoutineEditPage
        routine={createRoutine('A')}
        existingRoutines={[createRoutine('A')]}
        onSave={onSave}
        onBack={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'ワークアウト追加' }));
    await user.click(screen.getByRole('button', { name: '＋ 空白で追加' }));
    await user.click(screen.getAllByRole('button', { name: '保存' })[0]);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('同じ名前のルーティンは追加できません')).toBeInTheDocument();
  });

  describe('AIで追加', () => {
    it('generateAiRoutineが渡された場合「AIで追加」ボタンが表示される', () => {
      render(
        <RoutineEditPage
          routine={createRoutine('A')}
          existingRoutines={[]}
          onSave={vi.fn()}
          onBack={vi.fn()}
          generateAiRoutine={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'AIで追加' })).toBeInTheDocument();
    });

    it('generateAiRoutineが渡されない場合「AIで追加」ボタンは表示されない', () => {
      render(
        <RoutineEditPage
          routine={createRoutine('A')}
          existingRoutines={[]}
          onSave={vi.fn()}
          onBack={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: 'AIで追加' })).not.toBeInTheDocument();
    });

    it('「AIで追加」をクリックすると部位選択と時間入力パネルが表示される', async () => {
      const user = userEvent.setup();

      render(
        <RoutineEditPage
          routine={createRoutine('A')}
          existingRoutines={[]}
          onSave={vi.fn()}
          onBack={vi.fn()}
          generateAiRoutine={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: 'AIで追加' }));

      expect(screen.getByText('胸')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '生成して追加' })).toBeInTheDocument();
    });

    it('AI生成されたアイテムが既存ルーティンに追記される', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();

      const fakeGenerate = vi.fn().mockResolvedValue({
        id: 'generated',
        name: 'AI生成',
        items: [
          { id: 'item-1', title: 'ベンチプレス 10回', type: 'workout', durationSec: 45 },
          { id: 'item-2', title: '休憩', type: 'interval', durationSec: 120 },
          { id: 'item-3', title: 'ベンチプレス 10回', type: 'workout', durationSec: 45 },
        ],
        targetDurationSec: null,
        createdAt: new Date().toISOString(),
      } as Routine);

      render(
        <RoutineEditPage
          routine={createRoutine('A')}
          existingRoutines={[]}
          onSave={onSave}
          onBack={vi.fn()}
          generateAiRoutine={fakeGenerate}
        />
      );

      await user.click(screen.getByRole('button', { name: 'AIで追加' }));
      await user.click(screen.getByRole('button', { name: '胸' }));
      await user.click(screen.getByRole('button', { name: '10分' }));
      await user.click(screen.getByRole('button', { name: '生成して追加' }));

      await screen.findAllByText('ベンチプレス 10回');
      await user.click(screen.getAllByRole('button', { name: '保存' })[0]);

      expect(onSave).toHaveBeenCalledOnce();
      expect(onSave.mock.calls[0][0].items).toHaveLength(3);
    });
  });
});
