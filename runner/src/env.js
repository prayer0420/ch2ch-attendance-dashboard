function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다. .env.local 파일을 확인하세요.`);
  }
  return value;
}

function getRunnerConfig() {
  return {
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    runnerId: process.env.RUNNER_ID || "main-office-pc",
    pollIntervalMs: Number(process.env.RUNNER_POLL_INTERVAL_MS || 3000),
    heartbeatIntervalMs: 10000,
    once: process.argv.includes("--once")
  };
}

module.exports = { getRunnerConfig };
