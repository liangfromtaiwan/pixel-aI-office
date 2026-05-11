import type { DashboardTask, TaskStatus } from "@/lib/task-model";

import { TaskZone } from "./TaskZone";

export type StatusFilter = "all" | TaskStatus;

type TaskWorldProps = {
  tasks: DashboardTask[];
  filter: StatusFilter;
  selectedId: string | null;
  highlightedIds?: Set<string>;
  onSelect: (id: string) => void;
};

function applyFilter(tasks: DashboardTask[], filter: StatusFilter) {
  if (filter === "all") return tasks;
  return tasks.filter((t) => t.status === filter);
}

export function TaskWorld({ tasks, filter, selectedId, highlightedIds, onSelect }: TaskWorldProps) {
  const filtered = applyFilter(tasks, filter);

  const notStarted = filtered.filter((t) => t.status === "not_started");
  const inProgress = filtered.filter((t) => t.status === "in_progress");
  const completed = filtered.filter((t) => t.status === "completed");
  const blocked = filtered.filter((t) => t.status === "blocked");

  const cols =
    filter === "all"
      ? "lg:grid-cols-4"
      : filter === "not_started"
        ? "lg:grid-cols-1"
        : filter === "in_progress"
          ? "lg:grid-cols-1"
          : filter === "completed"
            ? "lg:grid-cols-1"
            : "lg:grid-cols-1";

  return (
    <div className={`grid grid-cols-1 gap-4 ${cols}`}>
      {(filter === "all" || filter === "not_started") && (
        <TaskZone
          title="Misty Docks"
          subtitle="Not Started · gray idle camp"
          tasks={notStarted}
          selectedId={selectedId}
          highlightedIds={highlightedIds}
          onSelect={onSelect}
          variant="fog"
        />
      )}

      {(filter === "all" || filter === "in_progress") && (
        <TaskZone
          title="Forest Workshop"
          subtitle="In Progress · bright busy zone"
          tasks={inProgress}
          selectedId={selectedId}
          highlightedIds={highlightedIds}
          onSelect={onSelect}
          variant="forest"
        />
      )}

      {(filter === "all" || filter === "completed") && (
        <TaskZone
          title="Sunrise Castle"
          subtitle="Completed · celebration hall"
          tasks={completed}
          selectedId={selectedId}
          highlightedIds={highlightedIds}
          onSelect={onSelect}
          variant="castle"
        />
      )}

      {(filter === "all" || filter === "blocked") && (
        <TaskZone
          title="Blazing Ravine"
          subtitle="Blocked · warning zone"
          tasks={blocked}
          selectedId={selectedId}
          highlightedIds={highlightedIds}
          onSelect={onSelect}
          variant="danger"
        />
      )}
    </div>
  );
}
