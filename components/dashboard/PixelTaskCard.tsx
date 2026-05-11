import type { DashboardTask } from "@/lib/task-model";

import { StatusBadge } from "./StatusBadge";

type PixelTaskCardProps = {
  task: DashboardTask;
  selected: boolean;
  highlighted?: boolean;
  onSelect: (id: string) => void;
};

function toToolClass(aiToolName: string): "cursor" | "claude" | "chatgpt" {
  const normalized = aiToolName.trim().toLowerCase();
  if (normalized.includes("claude")) return "claude";
  if (normalized.includes("chatgpt") || normalized.includes("gpt")) return "chatgpt";
  return "cursor";
}

function PixelAvatar({ task }: { task: DashboardTask }) {
  const { status, progress } = task;
  const tool = toToolClass(task.aiToolName);
  const wrap =
    status === "not_started"
      ? "adv-avatar adv-avatar--idle"
      : status === "in_progress"
        ? "adv-avatar adv-avatar--busy"
        : status === "blocked"
          ? "adv-avatar adv-avatar--blocked"
          : "adv-avatar adv-avatar--done";
  const progressTier =
    progress >= 100 ? "adv-outfit--max" : progress >= 70 ? "adv-outfit--high" : progress >= 40 ? "adv-outfit--mid" : "adv-outfit--low";

  return (
    <div className={`${wrap} adv-face--${tool}`} aria-hidden>
      <span className="adv-avatar__head" />
      <span className={`adv-avatar__body ${progressTier}`} />
      <span className="adv-avatar__eyes" />
      <span className="adv-avatar__mouth" />
      <span className={`adv-avatar__gear adv-avatar__gear--${tool}`} />
      {status === "completed" ? (
        <span className="adv-avatar__check" title="Completed">
          ✓
        </span>
      ) : null}
    </div>
  );
}

export function PixelTaskCard({ task, selected, highlighted = false, onSelect }: PixelTaskCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(task.id)}
      className={`adv-card group w-full max-w-[220px] text-left ${selected ? "adv-card--selected" : ""} ${highlighted ? "adv-card--flash" : ""}`}
    >
      <div className="flex items-start gap-3">
        <PixelAvatar task={task} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-[#1f1c16]">{task.title}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#6d5f42]">{task.aiToolName}</p>
          <StatusBadge status={task.status} className="scale-90 origin-left" />
        </div>
      </div>

      {task.status === "in_progress" ? (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#2a3f55]">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full border border-[#1f3b5c]/25 bg-black/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#22c55e] transition-[width] duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#4a4436]">{task.description}</p>
    </button>
  );
}
