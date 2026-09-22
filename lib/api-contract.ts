// Shared, non-secret contract. Keep existing endpoints stable for the web and desktop clients.
export const appContract = {
  id: "ch2ch-attendance-dashboard",
  contractVersion: "1.0.0",
  auth: { type: "session-cookie", login: "/api/auth/login", logout: "/api/auth/logout", crossOrigin: false },
  documentation: "/api/openapi",
  services: [
    { name: "출석 이력", endpoint: "/api/attendance", methods: ["GET"] },
    { name: "출석 실행", endpoint: "/api/runs", methods: ["GET", "POST"] },
    { name: "실행 상태", endpoint: "/api/runner/status", methods: ["GET"] },
    { name: "QR 출석", endpoint: "/api/qr-attendance", methods: ["GET", "POST"] },
    { name: "예배일지", endpoint: "/api/worship-journals", methods: ["GET", "POST"] },
    { name: "밴드 연결", endpoint: "/api/band/status", methods: ["GET"] }
  ],
  execution: { attendance: "runner-required", offlineWrites: false },
  limits: { jsonBytes: 4 * 1024 * 1024, multipartBytes: 48 * 1024 * 1024, maxPageSize: 100 }
} as const;

const errorResponse = { description: "요청 실패. error에 사용자용 메시지가 있습니다.", content: { "application/json": { schema: { type: "object", required: ["error"], properties: { error: { type: "string" } } } } } };
const responses = { "200": { description: "성공. demo=true인 경우 실제 운영 데이터가 아닌 샘플입니다." }, "400": errorResponse, "401": errorResponse, "403": errorResponse, "413": errorResponse, "500": errorResponse, "503": errorResponse };
const pageParameters = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, maximum: 100000, default: 1 } },
  { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
];

export const openApiDocument = {
  openapi: "3.0.3",
  info: { title: "CH2CH 앱 연결 API", version: appContract.contractVersion, description: "기존 /api 경로를 유지하는 연결·조회 명세입니다. 쓰기 API의 전체 계약은 docs/APP_API.md를 참조하세요. 동일 출처 로그인 쿠키가 필요하며 CORS 전체 공개는 지원하지 않습니다." },
  servers: [{ url: "/" }],
  security: [{ sessionCookie: [] }],
  components: { securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "ch2ch_admin_session" } } },
  paths: {
    "/api/app": { get: { operationId: "getAppConnection", summary: "인증·연결 및 앱 계약 조회 (외부 서비스 정상 여부와 별개)", responses } },
    "/api/openapi": { get: { operationId: "getOpenApi", summary: "이 API 명세 조회", responses } },
    "/api/auth/login": { post: { operationId: "login", security: [], summary: "관리자 접속 코드로 로그인", parameters: [{ name: "Origin", in: "header", required: true, schema: { type: "string" }, description: "요청 서버와 동일한 출처" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["password"], properties: { password: { type: "string", format: "password" } } } } } }, responses: { ...responses, "429": errorResponse } } },
    "/api/auth/logout": { post: { operationId: "logout", summary: "동일 출처 POST로 쿠키 삭제", parameters: [{ name: "Origin", in: "header", required: true, schema: { type: "string" } }], responses: { "303": { description: "로그인 화면으로 이동" }, "403": errorResponse } } },
    "/api/runs": { get: { operationId: "listRuns", summary: "출석 실행 목록", parameters: pageParameters, responses } },
    "/api/attendance": { get: { operationId: "listAttendance", summary: "출석 이력 목록", parameters: [...pageParameters,
      { name: "week", in: "query", schema: { type: "integer", minimum: 1, maximum: 53 } },
      { name: "family", in: "query", schema: { type: "string" } },
      { name: "name", in: "query", schema: { type: "string" } },
      { name: "service", in: "query", schema: { type: "string", enum: ["1-3", "4"] } },
      { name: "failuresOnly", in: "query", schema: { type: "boolean" } }
    ], responses } },
    "/api/runner/status": { get: { operationId: "getRunnerStatus", summary: "실행기 최근 상태 조회", responses } },
    "/api/worship-journals": { get: { operationId: "listJournals", summary: "저장 예배일지 목록 (응답: journals)", responses } },
    "/api/band/status": { get: { operationId: "getBandStatus", summary: "밴드 연결 상태", responses } }
  }
};
