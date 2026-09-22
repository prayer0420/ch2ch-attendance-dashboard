export function readPagination(params: URLSearchParams) {
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "20");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return null;
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}
