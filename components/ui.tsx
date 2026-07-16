import { clsx } from "@/lib/utils";

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-sea">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded border border-line bg-white/72 p-4 shadow-sm", className)}>{children}</section>;
}

export function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "moss" | "brick" | "brass" | "sea" }) {
  const color = {
    moss: "text-moss",
    brick: "text-brick",
    brass: "text-brass",
    sea: "text-sea"
  }[tone ?? "moss"];

  return (
    <div className="rounded border border-line bg-white/80 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/55">{label}</p>
      <p className={clsx("mt-2 text-2xl font-black", color)}>{value}</p>
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneClass = {
    default: "border-ink/20 bg-ink/5 text-ink",
    good: "border-moss/30 bg-moss/10 text-moss",
    warn: "border-brass/40 bg-brass/10 text-brass",
    bad: "border-brick/35 bg-brick/10 text-brick"
  }[tone];

  return <span className={clsx("inline-flex rounded border px-2 py-1 text-xs font-bold", toneClass)}>{children}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-dashed border-line bg-white/50 p-6 text-sm text-ink/60">{children}</div>;
}
