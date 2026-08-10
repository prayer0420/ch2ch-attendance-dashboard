const dashboardState = document.querySelector("#dashboard-state");
const runnerState = document.querySelector("#runner-state");
const errorBox = document.querySelector("#error-box");
const logs = document.querySelector("#logs");
const lastUpdated = document.querySelector("#last-updated");

function render(payload) {
  dashboardState.textContent = payload.services.dashboard.state === "running" ? "실행 중" : "종료됨";
  runnerState.textContent = payload.services.runner.state === "running" ? "실행 중" : "종료됨";
  errorBox.textContent = payload.error || "";
  errorBox.classList.toggle("hidden", !payload.error);
  logs.textContent = payload.logs?.length ? payload.logs.join("\n") : "오류 로그가 없습니다.";
  lastUpdated.textContent = new Date().toLocaleTimeString("ko-KR");
}

document.querySelector("#open-dashboard").addEventListener("click", () => window.ch2ch.openDashboard());
document.querySelector("#stop-services").addEventListener("click", async () => {
  await window.ch2ch.stopServices();
  window.close();
});
window.ch2ch.onStatus(render);
window.ch2ch.getStatus().then(render);
setInterval(() => window.ch2ch.getStatus().then(render), 1500);
