import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoRoutineRepository } from './goRoutineRepository';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const sampleRoutine = {
  id: 'r1', name: '朝トレ', items: [],
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
};

describe('GoRoutineRepository', () => {
  it('findAll はAuthorizationヘッダーにBearerトークンを付けて送る', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const getToken = vi.fn().mockResolvedValue('my-jwt-token');
    const repo = new GoRoutineRepository(getToken);
    await repo.findAll();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer my-jwt-token');
    expect(options.headers['X-User-ID']).toBeUndefined();
  });

  it('create は POST /routines を呼び、サーバーが返したルーティンを返す', async () => {
    const created = { ...sampleRoutine, id: 'server-generated-id' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => created });

    const repo = new GoRoutineRepository(vi.fn().mockResolvedValue('token'));
    const result = await repo.create(sampleRoutine);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/routines$/);
    expect(options.method).toBe('POST');
    expect(result).toEqual(created);
  });

  it('update は PUT /routines/:id を呼ぶ', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const repo = new GoRoutineRepository(vi.fn().mockResolvedValue('token'));
    await repo.update(sampleRoutine);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/routines\/r1$/);
    expect(options.method).toBe('PUT');
  });
});
