import { DURATION_PRESETS } from '@timeapp/core';

type Props = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

export function DurationPresetSelect({ value, onChange, className }: Props) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label="秒数"
      className={
        className ??
        'min-h-10 w-full rounded-xl border border-[#3C3C42] bg-[#2C2C30] px-3 text-sm text-[#F5F5F5] shadow-inner shadow-black/20 outline-none transition focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/15'
      }
    >
      {DURATION_PRESETS.map((preset) => (
        <option value={preset} key={preset}>
          {preset}秒
        </option>
      ))}
    </select>
  );
}
