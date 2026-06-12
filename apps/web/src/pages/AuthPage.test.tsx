import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthPage } from './AuthPage';

describe('AuthPage', () => {
  it('メールアドレスとパスワードでログインできる', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn().mockResolvedValue(undefined);

    render(<AuthPage onSignIn={onSignIn} onSignUp={vi.fn()} />);

    await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'password123');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(onSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('新規登録モードでアカウント登録できる', async () => {
    const user = userEvent.setup();
    const onSignUp = vi.fn().mockResolvedValue(undefined);

    render(<AuthPage onSignIn={vi.fn()} onSignUp={onSignUp} />);

    await user.click(screen.getByRole('button', { name: '新規登録はこちら' }));
    await user.type(screen.getByLabelText('メールアドレス'), 'new@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'password123');
    await user.click(screen.getByRole('button', { name: '新規登録' }));

    expect(onSignUp).toHaveBeenCalledWith('new@example.com', 'password123');
  });
});
