import { generateAiRoutine } from '../features/ai/aiRoutineService';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => jest.clearAllMocks());

describe('generateAiRoutine', () => {
  it('正しいエンドポイントに POST する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'テスト', items: [] }),
    });
    await generateAiRoutine('token', 'prompt');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/ai/generate-routine'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('Authorization ヘッダーにトークンが含まれる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'テスト', items: [] }),
    });
    await generateAiRoutine('my-token', 'prompt');
    const [, options] = mockFetch.mock.calls[0];
    expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');
  });

  it('レスポンスの items から Routine が生成される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: '胸トレ',
        items: [
          { title: 'ベンチプレス', type: 'workout', durationSec: 60 },
          { title: '休憩', type: 'interval', durationSec: 30 },
        ],
      }),
    });
    const routine = await generateAiRoutine('token', 'prompt');
    expect(routine.name).toBe('胸トレ');
    expect(routine.items.length).toBe(2);
    expect(routine.items[0].title).toBe('ベンチプレス');
  });

  it('res.ok が false なら例外をスローする', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(generateAiRoutine('token', 'prompt')).rejects.toThrow();
  });

  it('targetDurationSec を指定すると targetSec がリクエストに含まれる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'テスト', items: [] }),
    });
    await generateAiRoutine('token', 'prompt', 600);
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.targetSec).toBe(600);
  });
});
