import type { StatusFilter } from "./TaskWorld";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not Started" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "blocked", label: "Blocked" },
];

type FilterBarProps = {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
};

export function FilterBar({ value, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#3a3226] bg-[#f1e6c8] px-5 py-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6b5f45]">World filter</p>
        <p className="text-sm font-bold text-[#2a2620]">Focus one region, or view the whole map.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Status filters">
        {FILTERS.map((f) => {
          const active = value === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              className={`rounded-xl border-4 px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                active
                  ? "border-[#2a2620] bg-[#fff7da] text-[#1f1c16] shadow-[0_6px_0_#c9b48a]"
                  : "border-transparent bg-[#e6dcc4] text-[#4a4436] shadow-[0_6px_0_#b9a88b] hover:border-[#c9b48a]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
