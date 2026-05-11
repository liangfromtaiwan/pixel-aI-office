import type { TaskStatus } from "@/lib/task-model";

const COPY: Record<TaskStatus, { label: string; className: string }> = {
  not_started: {
    label: "Not Started",
    className: "border-[#5c6470] bg-[#e7eaef] text-[#3b424c]",
  },
  in_progress: {
    label: "In Progress",
    className: "border-[#2f6aa3] bg-[#d9ecff] text-[#1b3f63]",
  },
  completed: {
    label: "Completed",
    className: "border-[#2f7a4a] bg-[#daf5e3] text-[#1f4d30]",
  },
  blocked: {
    label: "Blocked",
    className: "border-[#a74922] bg-[#ffe4d8] text-[#6e2b13]",
  },
};

type StatusBadgeProps = {
  status: TaskStatus;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const cfg = COPY[status];
  return (
    <span
      className={`inline-flex items-center rounded-md border-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cfg.className} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
