import type { DashboardTask } from "@/lib/task-model";

import { PixelTaskCard } from "./PixelTaskCard";

type TaskZoneProps = {
  title: string;
  subtitle: string;
  tasks: DashboardTask[];
  selectedId: string | null;
  highlightedIds?: Set<string>;
  onSelect: (id: string) => void;
  /** Visual skin for the RPG “location” */
  variant: "fog" | "forest" | "castle" | "danger";
};

const ZONE_SKIN: Record<
  TaskZoneProps["variant"],
  { frame: string; ground: string; deco: string }
> = {
  fog: {
    frame: "border-[#6b7280] shadow-[0_10px_0_#9ca3af]",
    ground: "adv-ground adv-ground--fog",
    deco: "💤 · Waiting camp",
  },
  forest: {
    frame: "border-[#2f6aa3] shadow-[0_10px_0_#6aa6d8]",
    ground: "adv-ground adv-ground--forest",
    deco: "🌲 · Active workshop",
  },
  castle: {
    frame: "border-[#b0892c] shadow-[0_10px_0_#d9b65c]",
    ground: "adv-ground adv-ground--castle",
    deco: "🏰 · Success hall",
  },
  danger: {
    frame: "border-[#a74922] shadow-[0_10px_0_#d5845d]",
    ground: "adv-ground adv-ground--danger",
    deco: "⚠️ · Blocked canyon",
  },
};

export function TaskZone({ title, subtitle, tasks, selectedId, highlightedIds, onSelect, variant }: TaskZoneProps) {
  const skin = ZONE_SKIN[variant];

  return (
    <section
      className={`flex min-h-[460px] flex-col overflow-hidden rounded-2xl border-4 bg-[#f6f0df] ${skin.frame}`}
      aria-label={`${title} zone`}
    >
      <header className="relative border-b-4 border-black/15 bg-gradient-to-r from-white/70 to-white/20 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-black tracking-tight text-[#1f1c16]">{title}</h2>
            <p className="mt-0.5 text-xs font-semibold text-[#4a4436]">{subtitle}</p>
          </div>
          <span className="rounded-full border-2 border-black/15 bg-white/70 px-2 py-1 text-[10px] font-bold text-[#3a3428]">
            {tasks.length}
          </span>
        </div>
        <p className="mt-2 text-[11px] font-bold text-[#5b5345]">{skin.deco}</p>
      </header>

      <div className={`relative flex-1 p-4 ${skin.ground}`}>
        <div className="adv-map-grid pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

        {tasks.length === 0 ? (
          <div className="relative rounded-xl border-2 border-dashed border-black/20 bg-white/40 p-4 text-sm text-[#5b5345]">
            No tasks in this region with the current filter.
          </div>
        ) : (
          <div className="relative flex flex-wrap gap-3">
            {tasks.map((task) => (
              <PixelTaskCard
                key={task.id}
                task={task}
                selected={selectedId === task.id}
                highlighted={Boolean(highlightedIds?.has(task.id))}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
