import { fireEvent, render, screen } from '@testing-library/react-native';
import RoutineForm from '../components/RoutineForm';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const setRoutine = {
  id: 'r2',
  name: 'セットテスト',
  items: [
    { id: 's1', type: 'workout' as const, title: 'スクワット 1', durationSec: 60, voiceText: '', groupId: 'g1' },
    { id: 's2', type: 'interval' as const, title: '休憩', durationSec: 30, voiceText: '', groupId: 'g1' },
    { id: 's3', type: 'workout' as const, title: 'スクワット 2', durationSec: 60, voiceText: '', groupId: 'g1' },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const twoItemRoutine = {
  id: 'r1',
  name: 'テスト',
  items: [
    { id: 'i1', type: 'workout' as const, title: 'スクワット', durationSec: 30, voiceText: '' },
    { id: 'i2', type: 'workout' as const, title: 'プッシュアップ', durationSec: 20, voiceText: '' },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('RoutineForm — アイテムカード折りたたみ', () => {
  it('初期状態でアイテム入力フィールドは非表示', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    expect(screen.queryAllByPlaceholderText('アイテム名').length).toBe(0);
  });

  it('折りたたみ状態でタイトルがテキストとして表示される', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    expect(screen.getByText('スクワット')).toBeTruthy();
    expect(screen.getByText('プッシュアップ')).toBeTruthy();
  });

  it('カードをタップすると入力フィールドが表示される', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('スクワット'));
    expect(screen.getAllByPlaceholderText('アイテム名').length).toBeGreaterThan(0);
  });

  it('展開済みカードを再タップすると折りたたまれる', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('スクワット'));
    fireEvent.press(screen.getByText('スクワット'));
    expect(screen.queryAllByPlaceholderText('アイテム名').length).toBe(0);
  });
});

describe('RoutineForm — アイテム並び替え（ドラッグ）', () => {
  it('「↑」「↓」ボタンは存在しない', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    expect(screen.queryAllByText('↑').length).toBe(0);
    expect(screen.queryAllByText('↓').length).toBe(0);
  });

  it('各アイテムカードにドラッグハンドルが表示される', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    expect(screen.getAllByTestId('drag-handle').length).toBe(2);
  });
});

describe('RoutineForm — アイテム複製', () => {
  it('カードを展開すると「このアイテムを複製」ボタンが表示される', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('スクワット'));
    expect(screen.getAllByText('このアイテムを複製').length).toBe(1);
  });

  it('「このアイテムを複製」を押すとアイテムが1つ増える', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('スクワット'));
    fireEvent.press(screen.getByText('このアイテムを複製'));
    expect(screen.getAllByText('スクワット').length).toBe(2);
  });

  it('複製されたアイテムは元と同じタイトルを持つ', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    // 元カードを開いて複製
    fireEvent.press(screen.getByText('スクワット'));
    fireEvent.press(screen.getByText('このアイテムを複製'));
    // 元カードは展開済み、複製カード（2枚目のスクワット）を開く
    fireEvent.press(screen.getAllByText('スクワット')[1]);
    const inputs = screen.getAllByPlaceholderText('アイテム名');
    expect(inputs[0].props.value).toBe('スクワット');
    expect(inputs[1].props.value).toBe('スクワット');
  });
});

describe('RoutineForm — B1 目標時間設定', () => {
  it('目標時間の入力フィールドが表示される', () => {
    render(<RoutineForm title="作成" onSubmit={jest.fn()} />);
    expect(screen.getByPlaceholderText('目標時間（分）')).toBeTruthy();
  });

  it('初期値の targetDurationSec がある場合は分単位で表示される', () => {
    const routineWithTarget = { ...twoItemRoutine, targetDurationSec: 1200 };
    render(<RoutineForm title="編集" initialValues={routineWithTarget} onSubmit={jest.fn()} />);
    expect(screen.getByPlaceholderText('目標時間（分）').props.value).toBe('20');
  });

  it('目標時間を入力すると submit 時に targetDurationSec が含まれる', async () => {
    const mockSubmit = jest.fn().mockResolvedValue(undefined);
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={mockSubmit} />);
    fireEvent.changeText(screen.getByPlaceholderText('目標時間（分）'), '20');
    fireEvent.press(screen.getByText('保存'));
    await screen.findByText('保存');
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ targetDurationSec: 1200 })
    );
  });

  it('目標時間が空の場合 targetDurationSec は null になる', async () => {
    const mockSubmit = jest.fn().mockResolvedValue(undefined);
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={mockSubmit} />);
    fireEvent.press(screen.getByText('保存'));
    await screen.findByText('保存');
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ targetDurationSec: null })
    );
  });
});

describe('RoutineForm — B2 ペア種目セット', () => {
  it('セット追加フォームに「ペア種目（右/左）」トグルが表示される', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('セットを追加'));
    expect(screen.getByText('ペア種目（右/左）')).toBeTruthy();
  });

  it('ペア種目トグルをONにして追加すると「（右）」「（左）」アイテムが生成される', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('セットを追加'));
    fireEvent.press(screen.getByText('ペア種目（右/左）'));
    fireEvent.press(screen.getByText('追加'));
    expect(screen.getAllByDisplayValue(/（右）/).length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue(/（左）/).length).toBeGreaterThan(0);
  });

  it('ペア種目OFFの場合は通常のアイテムが追加される（右/左なし）', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('セットを追加'));
    fireEvent.press(screen.getByText('追加'));
    expect(screen.queryByDisplayValue(/（右）/)).toBeNull();
    expect(screen.queryByDisplayValue(/（左）/)).toBeNull();
  });
});

describe('RoutineForm — B3 AI で追加', () => {
  const mockGenerate = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('generateAiRoutine を渡すと「AI で追加」ボタンが表示される', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} generateAiRoutine={mockGenerate} />);
    expect(screen.getByText('AI で追加')).toBeTruthy();
  });

const noGroupIdRoutine = {
  id: 'r3',
  name: '名前ベーステスト',
  items: [
    { id: 'n1', type: 'workout' as const, title: 'スクワット 1', durationSec: 60, voiceText: '' },
    { id: 'n2', type: 'interval' as const, title: '休憩', durationSec: 30, voiceText: '' },
    { id: 'n3', type: 'workout' as const, title: 'スクワット 2', durationSec: 60, voiceText: '' },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('RoutineForm — 全表示/セット表示トグル', () => {
  it('初期状態は全表示：個別アイテムが見える', () => {
    render(<RoutineForm title="編集" initialValues={setRoutine} onSubmit={jest.fn()} />);
    expect(screen.getByText('スクワット 1')).toBeTruthy();
    expect(screen.getByText('スクワット 2')).toBeTruthy();
  });

  it('「セット」ボタンを押すとセットグループが表示される（groupIdあり）', () => {
    render(<RoutineForm title="編集" initialValues={setRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('セット'));
    expect(screen.getByText('2セット')).toBeTruthy();
  });

  it('groupIdがなくても名前ベースでグループ化される', () => {
    render(<RoutineForm title="編集" initialValues={noGroupIdRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('セット'));
    expect(screen.getByText('2セット')).toBeTruthy();
  });

  it('セット表示では個別アイテムタイトルが非表示になる', () => {
    render(<RoutineForm title="編集" initialValues={setRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('セット'));
    expect(screen.queryByText('スクワット 1')).toBeNull();
    expect(screen.queryByText('スクワット 2')).toBeNull();
  });

  it('セット表示から「全表示」を押すと個別アイテムに戻る', () => {
    render(<RoutineForm title="編集" initialValues={setRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('セット'));
    fireEvent.press(screen.getByText('全表示'));
    expect(screen.getByText('スクワット 1')).toBeTruthy();
    expect(screen.getByText('スクワット 2')).toBeTruthy();
  });
});

  it('generateAiRoutine がない場合「AI で追加」は表示されない', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    expect(screen.queryByText('AI で追加')).toBeNull();
  });

  it('「AI で追加」を押すと部位選択パネルが表示される', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} generateAiRoutine={mockGenerate} />);
    fireEvent.press(screen.getByText('AI で追加'));
    expect(screen.getByText('部位')).toBeTruthy();
  });

  it('部位と時間を選んで「生成」を押すと generateAiRoutine が呼ばれ items が追加される', async () => {
    mockGenerate.mockResolvedValueOnce({
      ...twoItemRoutine,
      name: 'AI生成',
      items: [
        { id: 'ai1', type: 'workout' as const, title: 'AI種目', durationSec: 60, voiceText: '' },
      ],
    });
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} generateAiRoutine={mockGenerate} />);
    fireEvent.press(screen.getByText('AI で追加'));
    fireEvent.press(screen.getByText('胸'));
    fireEvent.press(screen.getByText('10分'));
    fireEvent.press(screen.getByText('生成'));
    expect(await screen.findByDisplayValue('AI種目')).toBeTruthy();
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.stringContaining('胸'),
      600
    );
  });
});
