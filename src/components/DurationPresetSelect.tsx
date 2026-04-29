import { DURATION_PRESETS } from '../constants/durationPresets';

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
      className={className ?? 'min-h-10 w-full rounded-lg border border-[#efc4a2] bg-[#fffdfa] px-3 text-sm text-[#241710] shadow-inner shadow-[#f2d5bd]/40 focus:border-[#f26a21] focus:outline-none focus:ring-2 focus:ring-[#f26a21]/20'}
    >
      {DURATION_PRESETS.map((preset) => (
        <option value={preset} key={preset}>
          {preset}秒
        </option>
      ))}
    </select>
  );
}
