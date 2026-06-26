export function clsx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    try {
      const body = JSON.parse(text) as { error?: string };
      throw new Error(body.error || text);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(text);
      throw error;
    }
  }
  return response.json() as Promise<T>;
}
