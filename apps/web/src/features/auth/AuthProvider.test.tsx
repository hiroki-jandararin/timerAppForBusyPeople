import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';
import type { AuthService, AuthUser } from '@timeapp/core';

describe('AuthProvider', () => {
  it('未ログイン時はユーザーなしの状態を提供する', async () => {
    const authService = createAuthService(null);

    render(
      <AuthProvider authService={authService}>
        <AuthStatus />
      </AuthProvider>,
    );

    expect(await screen.findByText('未ログイン')).toBeInTheDocument();
  });

  it('同一ユーザーでonAuthStateChangeが再発火してもuserの参照は変わらない（トークン自動更新等での不要な再描画防止）', async () => {
    const user: AuthUser = { id: 'user-1', email: 'user@example.com' };
    let authStateHandler: ((user: AuthUser | null) => void) | undefined;
    const authService: AuthService = {
      getCurrentUser: vi.fn().mockResolvedValue(user),
      onAuthStateChange: vi.fn((handler) => {
        authStateHandler = handler;
        return () => undefined;
      }),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    };

    const seenUsers: (AuthUser | null)[] = [];
    function Recorder() {
      const { user } = useAuth();
      seenUsers.push(user);
      return <AuthStatus />;
    }

    render(
      <AuthProvider authService={authService}>
        <Recorder />
      </AuthProvider>,
    );

    await screen.findByText('user@example.com');
    const initialUser = seenUsers[seenUsers.length - 1];

    // トークンリフレッシュ等で同じ内容の「新しいオブジェクト」が渡されるケースを模擬
    authStateHandler?.({ id: 'user-1', email: 'user@example.com' });

    await screen.findByText('user@example.com');
    const afterRefreshUser = seenUsers[seenUsers.length - 1];

    expect(afterRefreshUser).toBe(initialUser);
  });
});

function AuthStatus() {
  const { isLoading, user } = useAuth();

  if (isLoading) return <p>読み込み中</p>;

  return <p>{user ? user.email : '未ログイン'}</p>;
}

function createAuthService(user: AuthUser | null): AuthService {
  return {
    getCurrentUser: vi.fn().mockResolvedValue(user),
    onAuthStateChange: vi.fn(() => () => undefined),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };
}
