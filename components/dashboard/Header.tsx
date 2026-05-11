type HeaderProps = {
  notStarted: number;
  inProgress: number;
  completed: number;
  blocked: number;
  lastSyncedAt: string | null;
  isPolling: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onTogglePolling: () => void;
};

export function Header({
  notStarted,
  inProgress,
  completed,
  blocked,
  lastSyncedAt,
  isPolling,
  isRefreshing,
  onRefresh,
  onTogglePolling,
}: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b-4 border-[#3a3226] bg-gradient-to-b from-[#fff7da] to-[#f1e6c8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#6b5f45]">Pixel productivity</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#1f1c16] sm:text-3xl">AI Task Adventure</h1>
        <p className="mt-1 max-w-xl text-sm font-semibold text-[#4a4436]">
          A tiny RPG world for your parallel AI work — see who is waiting, working, or done at a glance.
        </p>
        <p className="mt-1 text-xs font-bold text-[#6b5f45]">
          Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "Never"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="rounded-xl border-4 border-[#6b7280] bg-[#eef1f4] px-3 py-2 shadow-[0_6px_0_#b6bcc6]">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#4b5563]">Not Started</p>
          <p className="text-2xl font-black tabular-nums text-[#1f2937]">{notStarted}</p>
        </div>
        <div className="rounded-xl border-4 border-[#2f6aa3] bg-[#e5f2ff] px-3 py-2 shadow-[0_6px_0_#7eb6e6]">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#1b3f63]">In Progress</p>
          <p className="text-2xl font-black tabular-nums text-[#0f2f52]">{inProgress}</p>
        </div>
        <div className="rounded-xl border-4 border-[#2f7a4a] bg-[#e6f8ee] px-3 py-2 shadow-[0_6px_0_#8fd1a8]">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#1f4d30]">Completed</p>
          <p className="text-2xl font-black tabular-nums text-[#0f3a22]">{completed}</p>
        </div>
        <div className="rounded-xl border-4 border-[#a74922] bg-[#ffe4d8] px-3 py-2 shadow-[0_6px_0_#d5845d]">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#6e2b13]">Blocked</p>
          <p className="text-2xl font-black tabular-nums text-[#6e2b13]">{blocked}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border-4 border-[#2f6aa3] bg-[#d9ecff] px-3 py-2 text-xs font-black uppercase tracking-wide text-[#1b3f63] shadow-[0_6px_0_#7eb6e6]"
          disabled={isRefreshing}
        >
          {isRefreshing ? "Syncing..." : "Refresh"}
        </button>
        <button
          type="button"
          onClick={onTogglePolling}
          className={`rounded-xl border-4 px-3 py-2 text-xs font-black uppercase tracking-wide shadow-[0_6px_0_#b9a88b] ${
            isPolling
              ? "border-[#2f7a4a] bg-[#daf5e3] text-[#1f4d30]"
              : "border-[#6b7280] bg-[#eef1f4] text-[#3b424c]"
          }`}
        >
          {isPolling ? "Auto Sync On" : "Auto Sync Off"}
        </button>
      </div>
    </header>
  );
}
