import Link from "next/link";

type NavItem = {
  label: string;
  href?: string;
  badge?: number;
  active?: boolean;
  disabled?: boolean;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/", active: true },
  { label: "AI Agents", href: "/pet" },
  { label: "Task History", disabled: true },
  { label: "Notifications", badge: 3, disabled: true },
  { label: "Settings", href: "/settings/webhooks" },
];

export function Sidebar() {
  return (
    <aside className="flex w-full flex-col border-b-4 border-[#3a3226] bg-[#2a2620] text-[#f6f0df] md:w-56 md:border-b-0 md:border-r-4">
      <div className="border-b-4 border-black/25 px-4 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#cbbf9f]">Party</p>
        <p className="mt-1 text-lg font-black">Task Guild</p>
      </div>

      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible" aria-label="Main">
        {NAV.map((item) => {
          const content = (
            <span className="flex min-w-[9.5rem] items-center justify-between gap-2 md:min-w-0">
              <span>{item.label}</span>
              {item.badge ? (
                <span className="rounded-full border-2 border-[#f6d38a] bg-[#f0b429] px-2 py-0.5 text-[11px] font-black text-[#2a1f07]">
                  {item.badge}
                </span>
              ) : null}
            </span>
          );

          const className = `w-full rounded-lg border-2 px-3 py-2 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
            item.active
              ? "border-[#f0b429] bg-[#3f3a32] text-white"
              : "border-transparent bg-transparent text-[#e8dcc4] hover:border-[#5c5346] hover:bg-[#353028]"
          }`;

          if (item.href) {
            return (
              <Link key={item.label} href={item.href} className={className} aria-current={item.active ? "page" : undefined}>
                {content}
              </Link>
            );
          }

          return (
            <button key={item.label} type="button" className={className} disabled={item.disabled}>
              {content}
            </button>
          );
        })}
      </nav>

      <div className="hidden border-t-4 border-black/25 p-3 text-[11px] leading-snug text-[#cbbf9f] md:block">
        MVP mock UI — connect real agents later.
      </div>
    </aside>
  );
}
