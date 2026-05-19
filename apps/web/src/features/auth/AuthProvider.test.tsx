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
