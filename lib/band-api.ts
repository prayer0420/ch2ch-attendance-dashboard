const TARGET_NAME = "2026 임원밴드";
const API_BASE = "https://openapi.band.us";

type Band = {
  name: string;
  band_key: string;
  member_count: number;
};

type BandApiOptions = {
  accessToken?: string;
};

function getAccessToken(providedToken?: string) {
  const value = providedToken?.trim() || process.env.BAND_ACCESS_TOKEN?.trim();

  if (!value) {
    throw new Error("BAND 인증값이 아직 입력되지 않았습니다. 처음 화면에서 BAND access token을 입력해 주세요.");
  }

  return value;
}

async function bandRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...init, cache: "no-store" });
  const data = await response.json();

  if (!response.ok || data.result_code !== 1) {
    throw new Error(data.result_data?.message || "BAND API 요청에 실패했습니다.");
  }

  return data.result_data as T;
}

export async function resolveTargetBand(options: BandApiOptions = {}): Promise<Band> {
  const accessToken = getAccessToken(options.accessToken);
  const params = new URLSearchParams({ access_token: accessToken });
  const data = await bandRequest<{ bands: Band[] }>(`/v2.1/bands?${params}`);
  const matches = data.bands.filter((band) => band.name.trim() === TARGET_NAME);

  if (matches.length !== 1) {
    throw new Error(
      matches.length
        ? `같은 이름의 "${TARGET_NAME}" 밴드가 여러 개라 안전하게 게시할 수 없습니다.`
        : `"${TARGET_NAME}" 밴드를 찾지 못해 게시를 차단했습니다.`,
    );
  }

  const configuredKey = process.env.BAND_TARGET_KEY?.trim();
  if (configuredKey && matches[0].band_key !== configuredKey) {
    throw new Error("설정된 밴드 ID와 실제 대상이 달라 게시를 차단했습니다.");
  }

  return matches[0];
}

export async function publishToTargetBand(content: string, options: BandApiOptions = {}) {
  const accessToken = getAccessToken(options.accessToken);
  const band = await resolveTargetBand({ accessToken });
  const permissionParams = new URLSearchParams({
    access_token: accessToken,
    band_key: band.band_key,
    permissions: "posting",
  });
  const permission = await bandRequest<{ permissions?: string[]; permission?: string[] }>(
    `/v2/band/permissions?${permissionParams}`,
  );
  const permissions = permission.permissions ?? permission.permission ?? [];

  if (!permissions.includes("posting")) {
    throw new Error(`이 BAND 계정에는 "${TARGET_NAME}" 글쓰기 권한이 없습니다.`);
  }

  const form = new URLSearchParams({
    access_token: accessToken,
    band_key: band.band_key,
    content,
    do_push: "false",
  });

  return bandRequest<{ band_key: string; post_key: string }>("/v2.2/band/post/create", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
}

export { TARGET_NAME };
