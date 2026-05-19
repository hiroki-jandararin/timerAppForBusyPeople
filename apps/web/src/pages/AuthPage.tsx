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

  const inputClass =
    'min-h-12 w-full rounded-xl border border-[#3C3C42] bg-[#2C2C30] px-4 text-base text-[#F5F5F5] placeholder-[#A0A0A5] outline-none transition focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20';

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-sm content-center p-4 sm:p-5">
      <section className="rounded-2xl border border-[#3C3C42] bg-[#1E1E21] p-6 shadow-2xl shadow-black/60">
        {/* Brand header */}
        <div className="mb-6 text-center">
          <h1 className="m-0 font-bebas text-5xl tracking-wide text-[#FF6B35]">QuickFit Timer</h1>
          <p className="m-0 mt-1 text-xs font-black tracking-[0.2em] uppercase text-[#A0A0A5]">
            {title}
          </p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-xs font-black tracking-[0.15em] uppercase text-[#A0A0A5]">
            メールアドレス
            <input
              className={inputClass}
              type="email"
              value={email}
              autoComplete="email"
              required
              placeholder="you@example.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-black tracking-[0.15em] uppercase text-[#A0A0A5]">
            パスワード
            <input
              className={inputClass}
              type="password"
              value={password}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              minLength={6}
              required
              placeholder="••••••••"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage && (
            <p className="m-0 rounded-xl border border-[#EF444430] bg-[#EF444410] p-3 text-sm font-bold text-[#EF4444]">
              {errorMessage}
            </p>
          )}

          {notice && (
            <p className="m-0 rounded-xl border border-[#4ADE8030] bg-[#4ADE8010] p-3 text-sm font-bold text-[#4ADE80]">
              {notice}
            </p>
          )}

          <button
            className="min-h-14 w-full rounded-2xl bg-[#FF6B35] font-black text-lg text-[#F5F5F5] shadow-lg shadow-[#FF6B35]/20 transition active:scale-[0.97] disabled:opacity-50"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '送信中...' : title}
          </button>
        </form>

        <button
          className="mt-3 min-h-12 w-full rounded-2xl border border-[#3C3C42] bg-[#2C2C30] text-sm font-bold text-[#A0A0A5] transition active:scale-[0.97]"
          type="button"
          onClick={() => {
            setMode(isSignIn ? 'signUp' : 'signIn');
            setErrorMessage('');
            setNotice('');
          }}
        >
          {isSignIn ? '新規登録はこちら' : 'ログインはこちら'}
        </button>
      </section>
    </main>
  );
}
