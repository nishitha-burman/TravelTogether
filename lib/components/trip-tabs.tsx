"use client";

import { useId, useRef, useState, type ReactNode } from "react";

type TripTab = { id: string; label: string; content: ReactNode };

export function TripTabs({ tabs }: { tabs: TripTab[] }) {
  const prefix = useId();
  const [selected, setSelected] = useState(tabs[0].id);
  const [visited, setVisited] = useState(() => new Set([tabs[0].id]));
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const active = tabs.some((tab) => tab.id === selected)
    ? selected
    : tabs[0].id;

  function select(index: number) {
    const id = tabs[index].id;
    setSelected(id);
    setVisited((previous) => new Set(previous).add(id));
  }

  return (
    <div className="min-w-0 space-y-6">
      <div
        role="tablist"
        aria-label="Trip sections"
        className="flex gap-1 overflow-x-auto border-b border-[var(--line)]"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${prefix}-tab-${tab.id}`}
            aria-controls={`${prefix}-panel-${tab.id}`}
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            className={`min-h-12 shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition ${active === tab.id ? "border-[var(--ink)] text-[var(--ink)]" : "border-transparent text-[var(--muted)] hover:bg-[#edf0e9]"}`}
            onClick={() => select(index)}
            onKeyDown={(event) => {
              let next: number;
              if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
              else if (event.key === "ArrowLeft")
                next = (index - 1 + tabs.length) % tabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = tabs.length - 1;
              else return;
              event.preventDefault();
              select(next);
              buttons.current[next]?.focus();
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${prefix}-panel-${tab.id}`}
          aria-labelledby={`${prefix}-tab-${tab.id}`}
          hidden={active !== tab.id}
          tabIndex={0}
          className="min-w-0 space-y-6"
        >
          {visited.has(tab.id) || active === tab.id ? tab.content : null}
        </div>
      ))}
    </div>
  );
}
