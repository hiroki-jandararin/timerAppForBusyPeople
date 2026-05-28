import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoRoutineRepository } from './goRoutineRepository';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

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
});
