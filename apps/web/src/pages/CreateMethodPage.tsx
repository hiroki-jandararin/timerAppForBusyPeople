type Props = {
  onSelectTemplate: () => void;
  onSelectAI: () => void;
  onSelectBlank: () => void;
  onBack: () => void;
};

export function CreateMethodPage({ onSelectTemplate, onSelectAI, onSelectBlank, onBack }: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg p-4 sm:p-5">
      <header className="mb-6">
        <button
          className="text-sm font-bold tracking-widest text-[#A0A0A5] uppercase transition hover:text-[#F5F5F5]"
          onClick={onBack}
        >
          ← 戻る
        </button>
        <h1
          className="m-0 mt-3 text-[2.2rem] font-black leading-tight text-[#F5F5F5]"
          style={{ textShadow: '0 0 40px #FF6B3530' }}
        >
          新規作成
        </h1>
        <p className="m-0 mt-1 text-[0.6rem] font-black tracking-[0.22em] uppercase text-[#505058]">
          どんな方法で作りますか？
        </p>
      </header>

      <div className="grid gap-3">
        {/* AI */}
        <button
          type="button"
          className="w-full overflow-hidden rounded-2xl border border-[#FF6B3545] bg-[#FF6B3508] p-5 text-left transition active:scale-[0.98]"
          onClick={onSelectAI}
        >
          <div
            className="h-0.75 -mx-5 -mt-5 mb-4 rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg, #FF6B35, #FF8C42)' }}
          />
          <p className="m-0 text-lg font-black text-[#FF6B35]">AIで作成</p>
          <p className="m-0 mt-1 text-sm font-bold text-[#A0A0A5]">
            鍛えたい部位・時間を選ぶだけで自動生成
          </p>
        </button>

        {/* Template */}
        <button
          type="button"
          className="w-full overflow-hidden rounded-2xl border border-[#3C3C42] bg-[#2C2C30] p-5 text-left transition active:scale-[0.98]"
          onClick={onSelectTemplate}
        >
          <div
            className="h-0.75 -mx-5 -mt-5 mb-4 rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg, #3C3C42, #505058)' }}
          />
          <p className="m-0 text-lg font-black text-[#F5F5F5]">テンプレートから選ぶ</p>
          <p className="m-0 mt-1 text-sm font-bold text-[#A0A0A5]">
            用意されたメニューをベースにカスタマイズ
          </p>
        </button>

        {/* Blank */}
        <button
          type="button"
          className="w-full rounded-2xl border border-[#3C3C42] bg-[#1E1E21] p-5 text-left transition active:scale-[0.98]"
          onClick={onSelectBlank}
        >
          <p className="m-0 text-lg font-black text-[#F5F5F5]">最初から作る</p>
          <p className="m-0 mt-1 text-sm font-bold text-[#505058]">何も入っていない状態から作成</p>
        </button>
      </div>
    </main>
  );
}
