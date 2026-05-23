import { statusLabel } from "@/lib/utils";

const ICONS: Record<string, string> = {
  draft:     "○",
  sent:      "→",
  paid:      "✓",
  overdue:   "!",
  cancelled: "×",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold tracking-wide status-${status}`}
      data-testid={`badge-status-${status}`}
    >
      <span className="text-xs leading-none">{ICONS[status] ?? "•"}</span>
      {statusLabel(status)}
    </span>
  );
}
