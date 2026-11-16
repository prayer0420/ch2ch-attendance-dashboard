function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다. .env.local 파일을 확인하세요.`);
  }
  return value;
}

function getRunnerConfig() {
  return {
    // The shared provider validates either the PC database or legacy cloud settings.
    runnerId: process.env.RUNNER_ID || "main-office-pc",
    dashboardUrl: process.env.RUNNER_DASHBOARD_URL || "http://localhost:3000",
    pollIntervalMs: Number(process.env.RUNNER_POLL_INTERVAL_MS || 3000),
    heartbeatIntervalMs: 10000,
    once: process.argv.includes("--once")
  };
}

module.exports = { getRunnerConfig };
