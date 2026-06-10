import { useState } from 'react';
import type { Routine } from '@timeapp/core';

type Props = {
  onGenerate: (routine: Routine) => void;
  onBack: () => void;
  generateAiRoutine: (prompt: string, targetDurationSec?: number) => Promise<Routine>;
};

const BODY_PARTS = [
  '胸',
  '背中',
  '肩',
  '腕（前）',
  '腕（後ろ）',
  '足（前）',
  '足（後ろ）',
  '腹筋',
  '背筋',
  'ふくらはぎ',
] as const;

const DURATION_PRESETS = [10, 15, 20, 30, 45, 60] as const;

const INTERVALS = [
  { label: '短め', description: '約15秒' },
  { label: '普通', description: '約30秒' },
  { label: '長め', description: '約60秒' },
] as const;

type Interval = (typeof INTERVALS)[number]['label'];

function buildPrompt(parts: string[], minutes: number, interval: Interval, extra: string): string {
  const partStr = parts.join('・');
  let prompt = `${partStr}を${minutes}分で鍛えたい。インターバルは${interval}。`;
  if (extra.trim()) prompt += ` ${extra.trim()}`;
  return prompt;
}

export function AIPromptPage({ onGenerate, onBack, generateAiRoutine }: Props) {
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<Interval | null>(null);
  const [extra, setExtra] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minutesError =
    selectedMinutes !== null && selectedMinutes > 120 ? '120分（2時間）を超えています' : null;

  const canGenerate =
    selectedParts.length > 0 &&
    selectedMinutes !== null &&
    selectedMinutes >= 1 &&
    !minutesError &&
    selectedInterval !== null;

  function togglePart(part: string) {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    const prompt = buildPrompt(selectedParts, selectedMinutes!, selectedInterval!, extra);
    setIsLoading(true);
    setError(null);
    try {
      const routine = await generateAiRoutine(prompt, selectedMinutes! * 60);
      onGenerate(routine);
    } catch {
      setError('生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg p-4 sm:p-5">
      <header className="mb-6">
        <button
          className="text-sm font-bold tracking-widest text-[#A0A0A5] uppercase transition hover:text-[#F5F5F5]"
          onClick={onBack}
          disabled={isLoading}
        >
          ← 戻る
        </button>
        <h1
          className="m-0 mt-3 text-[2.2rem] font-black leading-tight text-[#F5F5F5]"
          style={{ textShadow: '0 0 40px #FF6B3530' }}
        >
          AIで作成
        </h1>
        <p className="m-0 mt-1 text-[0.6rem] font-black tracking-[0.22em] uppercase text-[#505058]">
          Generate with AI
        </p>
      </header>

      <div className="grid gap-5">
        {/* 部位 */}
        <section className="rounded-2xl border border-[#3C3C42] bg-[#1E1E21] p-4">
          <h2 className="m-0 mb-3 text-xs font-black tracking-widest uppercase text-[#A0A0A5]">
            どこを鍛える？
            <span className="ml-2 text-[#505058] normal-case tracking-normal">複数選択可</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {BODY_PARTS.map((part) => {
              const selected = selectedParts.includes(part);
              return (
                <button
                  key={part}
                  type="button"
                  onClick={() => togglePart(part)}
                  className="rounded-xl px-3 py-1.5 text-sm font-bold transition active:scale-[0.95]"
                  style={
                    selected
                      ? { background: '#FF6B35', color: '#F5F5F5' }
                      : { background: '#2C2C30', color: '#A0A0A5', border: '1px solid #3C3C42' }
                  }
                >
                  {part}
                </button>
              );
            })}
          </div>
        </section>

        {/* トータル時間 */}
        <section className="rounded-2xl border border-[#3C3C42] bg-[#1E1E21] p-4">
          <h2 className="m-0 mb-3 text-xs font-black tracking-widest uppercase text-[#A0A0A5]">
            トータル時間
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {DURATION_PRESETS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setSelectedMinutes(min)}
                className="rounded-xl px-3 py-1.5 text-sm font-bold transition active:scale-[0.95]"
                style={
                  selectedMinutes === min
                    ? { background: '#FF6B35', color: '#F5F5F5' }
                    : { background: '#2C2C30', color: '#A0A0A5', border: '1px solid #3C3C42' }
                }
              >
                {min}分
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#3C3C42] bg-[#2C2C30] text-lg font-black text-[#A0A0A5] transition hover:text-[#F5F5F5] active:scale-[0.95]"
              onClick={() => setSelectedMinutes((v) => Math.max(1, (v ?? 0) - 5))}
            >
              −
            </button>
            <div className="relative flex-1">
              <input
                type="number"
                min={1}
                max={120}
                value={selectedMinutes ?? ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedMinutes(
                    e.target.value === '' ? null : isNaN(val) ? null : Math.max(1, val)
                  );
                }}
                placeholder="分を入力"
                className="w-full rounded-xl border px-3 py-2 text-center text-sm font-bold text-[#F5F5F5] placeholder-[#505058] outline-none transition"
                style={{
                  background: '#2C2C30',
                  borderColor: minutesError ? '#EF4444' : '#3C3C42',
                }}
              />
            </div>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#3C3C42] bg-[#2C2C30] text-lg font-black text-[#A0A0A5] transition hover:text-[#F5F5F5] active:scale-[0.95]"
              onClick={() => setSelectedMinutes((v) => Math.min(120, (v ?? 0) + 5))}
            >
              ＋
            </button>
            <span className="shrink-0 text-sm font-bold text-[#505058]">分</span>
          </div>
          {minutesError && (
            <p className="m-0 mt-2 text-xs font-bold text-[#EF4444]">{minutesError}</p>
          )}
        </section>

        {/* インターバル */}
        <section className="rounded-2xl border border-[#3C3C42] bg-[#1E1E21] p-4">
          <h2 className="m-0 mb-3 text-xs font-black tracking-widest uppercase text-[#A0A0A5]">
            インターバル（休憩）
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {INTERVALS.map(({ label, description }) => {
              const selected = selectedInterval === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedInterval(label)}
                  className="rounded-xl p-3 text-center transition active:scale-[0.95]"
                  style={
                    selected
                      ? { background: '#FF6B3520', border: '1px solid #FF6B35', color: '#FF6B35' }
                      : { background: '#2C2C30', border: '1px solid #3C3C42', color: '#A0A0A5' }
                  }
                >
                  <p className="m-0 text-sm font-black">{label}</p>
                  <p className="m-0 mt-0.5 text-[0.6rem] opacity-60">{description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 追加リクエスト（任意） */}
        <section className="rounded-2xl border border-[#3C3C42] bg-[#1E1E21] p-4">
          <h2 className="m-0 mb-3 text-xs font-black tracking-widest uppercase text-[#A0A0A5]">
            追加のリクエスト
            <span className="ml-2 text-[#505058] normal-case tracking-normal">任意</span>
          </h2>
          <textarea
            className="w-full resize-none rounded-xl border border-[#3C3C42] bg-[#2C2C30] p-3 text-sm text-[#F5F5F5] placeholder-[#505058] outline-none focus:border-[#FF6B3560] transition"
            rows={2}
            placeholder="例: 初心者向け、ダンベルなし"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            disabled={isLoading}
          />
        </section>

        {/* 生成プロンプトプレビュー */}
        {canGenerate && (
          <div className="rounded-xl border border-[#FF6B3530] bg-[#FF6B3508] px-4 py-3">
            <p className="m-0 text-[0.6rem] font-black tracking-widest uppercase text-[#FF6B3560]">
              生成するプロンプト
            </p>
            <p className="m-0 mt-1 text-sm text-[#A0A0A5]">
              {buildPrompt(selectedParts, selectedMinutes!, selectedInterval!, extra)}
            </p>
          </div>
        )}

        {error && (
          <p className="m-0 rounded-xl border border-[#EF444430] bg-[#EF444410] px-4 py-3 text-sm font-bold text-[#EF4444]">
            {error}
          </p>
        )}

        <button
          className="min-h-14 w-full rounded-2xl text-base font-black text-[#F5F5F5] transition active:scale-[0.97] disabled:opacity-40"
          style={{
            background:
              isLoading || !canGenerate
                ? 'linear-gradient(135deg, #505058, #3C3C42)'
                : 'linear-gradient(135deg, #FF6B35, #FF8C42)',
            boxShadow: isLoading || !canGenerate ? 'none' : '0 4px 24px #FF6B3530',
          }}
          onClick={handleGenerate}
          disabled={isLoading || !canGenerate}
        >
          {isLoading ? '生成中...' : 'ルーティンを生成する'}
        </button>
      </div>
    </main>
  );
}
