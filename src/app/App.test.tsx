import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthenticatedApp } from './App';
import { STORAGE_KEY } from '../features/routines/localStorageRoutineRepository';
import type { AuthService, AuthUser } from '../features/auth/authTypes';

describe('App', () => {
  beforeEach(() => {
    const storage = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
  });

  it('新しいルーティンは保存を押すまでリストに出ない', async () => {
    const user = userEvent.setup();

    render(<AuthenticatedApp authService={createSignedInAuthService()} />);

    await screen.findByText('全身トレーニング');

    const initial = readRoutinesFromStorage();
    expect(initial).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '＋ 新規' }));
    expect(screen.getByText('ルーティン名')).toBeInTheDocument();
    expect(readRoutinesFromStorage()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '← 戻る' }));
    await waitFor(() => expect(screen.getByText('全身トレーニング')).toBeInTheDocument());
    expect(readRoutinesFromStorage()).toHaveLength(1);
  });

  it('未ログイン時はログイン画面を表示する', async () => {
    render(<AuthenticatedApp authService={createAuthService(null)} />);

    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.queryByText('全身トレーニング')).not.toBeInTheDocument();
  });
});

function readRoutinesFromStorage(): unknown[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { routines?: unknown[] };
    return Array.isArray(parsed.routines) ? parsed.routines : [];
  } catch {
    return [];
  }
}

function createSignedInAuthService(): AuthService {
  return createAuthService({ id: 'user-1', email: 'test@example.com' });
}

function createAuthService(user: AuthUser | null): AuthService {
  return {
    getCurrentUser: async () => user,
    onAuthStateChange: () => () => undefined,
    signIn: async () => undefined,
    signUp: async () => undefined,
    signOut: async () => undefined,
  };
}

function createStorageMock() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}
