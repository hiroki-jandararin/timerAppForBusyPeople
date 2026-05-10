import { FormEvent, useState } from 'react';

type AuthMode = 'signIn' | 'signUp';

type Props = {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
};

export function AuthPage({ onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignIn = mode === 'signIn';
  const title = isSignIn ? 'ログイン' : '新規登録';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setNotice('');
    setIsSubmitting(true);

    try {
      if (isSignIn) {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password);
        setNotice('確認メールを送信しました。メール内のリンクを開いて登録を完了してください。');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '認証に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-130 content-center p-4 text-[#241710] sm:p-5">
      <section className="rounded-lg border border-[#f4d0b3] bg-[#fffdfa] p-5 shadow-sm shadow-[#d96a1f]/5">
        <div className="mb-5">
          <h1 className="m-0 text-3xl font-black leading-tight">QuickFit Timer</h1>
          <p className="m-0 mt-1 text-sm font-medium text-[#a65a2a]">{title}</p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-bold text-[#5c3520]">
            メールアドレス
            <input
              className="min-h-12 rounded-lg border border-[#efc4a2] bg-white px-3 text-base text-[#241710] outline-none focus:border-[#e95f1a]"
              type="email"
              value={email}
              autoComplete="email"
              required
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm font-bold text-[#5c3520]">
            パスワード
            <input
              className="min-h-12 rounded-lg border border-[#efc4a2] bg-white px-3 text-base text-[#241710] outline-none focus:border-[#e95f1a]"
              type="password"
              value={password}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              minLength={6}
              required
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage ? (
            <p className="m-0 rounded-lg border border-[#f0b3a2] bg-[#fff0ec] p-3 text-sm font-bold text-[#b83218]">
              {errorMessage}
            </p>
          ) : null}

          {notice ? (
            <p className="m-0 rounded-lg border border-[#b6d9b4] bg-[#f1fff0] p-3 text-sm font-bold text-[#2d6b2c]">
              {notice}
            </p>
          ) : null}

          <button
            className="min-h-12 rounded-lg border border-[#e45112] bg-[#e95f1a] px-3 font-bold text-white shadow-sm shadow-[#f26a21]/25 transition disabled:opacity-60 active:translate-y-px"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '送信中' : title}
          </button>
        </form>

        <button
          className="mt-4 min-h-10 w-full rounded-lg border border-[#efc4a2] bg-[#fff7ef] px-3 text-sm font-bold text-[#b84b12] shadow-sm shadow-[#d96a1f]/5 transition active:translate-y-px"
          type="button"
          onClick={() => {
            setMode(isSignIn ? 'signUp' : 'signIn');
            setErrorMessage('');
            setNotice('');
          }}
        >
          {isSignIn ? '新規登録' : 'ログイン'}
        </button>
      </section>
    </main>
  );
}
