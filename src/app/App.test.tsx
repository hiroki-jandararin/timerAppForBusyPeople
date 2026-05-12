import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthenticatedApp } from './App';
import type { AuthService, AuthUser } from '../features/auth/authTypes';
import type { RoutineRepository } from '../features/routines/routineRepository';
import type { Routine } from '../features/routines/routineTypes';

describe('App', () => {
  it('空状態から新規作成を開始しても保存するまではリストに出ない', async () => {
    const user = userEvent.setup();
    const repository = new MemoryRoutineRepository();

    render(
      <AuthenticatedApp
        authService={createSignedInAuthService()}
        createRoutineRepository={() => repository}
      />,
    );

    expect(await screen.findByRole('button', { name: '最初のルーティンを作成' })).toBeInTheDocument();
    await expect(repository.findAll()).resolves.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: '最初のルーティンを作成' }));
    expect(screen.getByText('テンプレートを選ぶ')).toBeInTheDocument();
    await expect(repository.findAll()).resolves.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: '最初から作る' }));
    expect(screen.getByText('ルーティン名')).toBeInTheDocument();
    await expect(repository.findAll()).resolves.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: '← 戻る' }));
    expect(screen.getByText('テンプレートを選ぶ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '← 戻る' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '最初のルーティンを作成' })).toBeInTheDocument(),
    );
    await expect(repository.findAll()).resolves.toHaveLength(0);
  });

  it('未ログイン時はログイン画面を表示する', async () => {
    render(
      <AuthenticatedApp
        authService={createAuthService(null)}
        createRoutineRepository={() => new MemoryRoutineRepository()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.queryByText('全身トレーニング')).not.toBeInTheDocument();
  });
});

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

class MemoryRoutineRepository implements RoutineRepository {
  private routines: Routine[] = [];

  async findAll() {
    return [...this.routines];
  }

  async findById(id: string) {
    return this.routines.find((routine) => routine.id === id) ?? null;
  }

  async save(routine: Routine) {
    const index = this.routines.findIndex((item) => item.id === routine.id);
    if (index >= 0) {
      this.routines[index] = routine;
    } else {
      this.routines.push(routine);
    }
  }

  async delete(id: string) {
    this.routines = this.routines.filter((routine) => routine.id !== id);
  }
}
