import Link from "next/link";
import { Database, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, EmptyState, Panel, SectionTitle, StatCard } from "@/components/ui";
import { DB_TABLES, getDbTableRows } from "@/lib/db-browser";
import { clsx } from "@/lib/utils";

type DatabasePageProps = {
  searchParams: Promise<{
    table?: string;
    limit?: string;
  }>;
};

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return new Intl.NumberFormat("ko-KR").format(value);
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(text));
  }
  return text;
}

function columnPriority(column: string) {
  const order = [
    "id",
    "status",
    "message",
    "name",
    "family",
    "original_family",
    "target_week",
    "target_week_text",
    "created_at",
    "requested_at",
    "updated_at"
  ];
  const index = order.indexOf(column);
  return index === -1 ? order.length : index;
}

function getColumns(rows: Array<Record<string, unknown>>) {
  const columns = new Set<string>();
  for (const row of rows.slice(0, 50)) {
    Object.keys(row).forEach((key) => columns.add(key));
  }
  return Array.from(columns).sort((a, b) => {
    const priority = columnPriority(a) - columnPriority(b);
    if (priority !== 0) return priority;
    return a.localeCompare(b);
  });
}

export default async function DatabasePage({ searchParams }: DatabasePageProps) {
  const params = await searchParams;
  const limit = Number(params.limit ?? "100");
  const { table, rows, count, demo } = await getDbTableRows(params.table, limit);
  const columns = getColumns(rows);

  return (
    <AppShell>
      <SectionTitle eyebrow={demo ? "데모 DB" : "Supabase DB"} title="DB 바로보기">
        <Link className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-bold" href={`/database?table=${table.name}&limit=${limit}`}>
          <RefreshCw size={16} />
          새로고침
        </Link>
      </SectionTitle>

      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="선택 테이블" value={table.label} tone="sea" />
          <StatCard label="총 행 수" value={count} tone="moss" />
          <StatCard label="화면 표시" value={`${rows.length}행`} tone="brass" />
        </div>

        <Panel>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Database size={18} />
                <h2 className="text-lg font-black">{table.label}</h2>
                <Badge tone={demo ? "warn" : "good"}>{demo ? "데모 데이터" : "실제 Supabase"}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink/60">{table.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[50, 100, 200, 500].map((size) => (
                <Link
                  key={size}
                  href={`/database?table=${table.name}&limit=${size}`}
                  className={clsx(
                    "focus-ring rounded border px-3 py-2 text-xs font-bold",
                    limit === size ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"
                  )}
                >
                  {size}행
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {DB_TABLES.map((item) => (
              <Link
                key={item.name}
                href={`/database?table=${item.name}&limit=${limit || 100}`}
                className={clsx(
                  "focus-ring whitespace-nowrap rounded border px-3 py-2 text-sm font-bold",
                  item.name === table.name ? "border-sea bg-sea text-white" : "border-line bg-white text-ink"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {rows.length && columns.length ? (
            <div className="max-h-[640px] overflow-auto rounded border border-line bg-white">
              <table className="w-full min-w-[980px] border-collapse text-xs">
                <thead className="sticky top-0 bg-paper text-left text-ink/65">
                  <tr className="border-b border-line">
                    {columns.map((column) => (
                      <th key={column} className="whitespace-nowrap px-3 py-2 font-black">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={String(row.id ?? index)} className="border-b border-line/60 align-top last:border-0">
                      {columns.map((column) => (
                        <td key={column} className="max-w-[360px] whitespace-nowrap px-3 py-2 text-ink/78">
                          <span className="block overflow-hidden text-ellipsis" title={String(formatCell(row[column]))}>
                            {formatCell(row[column])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>이 테이블에는 아직 표시할 데이터가 없습니다.</EmptyState>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
