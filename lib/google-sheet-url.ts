export function googleCsvExportUrl(value: string, tab: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || url.port || url.username || url.password) return null;
    const published = url.pathname.match(/^\/spreadsheets\/d\/e\/([\w-]+)(?:\/|$)/);
    if (published) {
      const result = new URL(`https://docs.google.com/spreadsheets/d/e/${published[1]}/pub`);
      result.searchParams.set("output", "csv");
      const gid = url.searchParams.get("gid") || new URLSearchParams(url.hash.slice(1)).get("gid");
      if (gid && /^\d+$/.test(gid)) result.searchParams.set("gid", gid);
      return result.toString();
    }
    const id = url.pathname.match(/^\/spreadsheets\/d\/([\w-]+)(?:\/|$)/)?.[1];
    if (!id || id === "e") return null;
    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab || "가장체크")}`;
  } catch { return null; }
}
