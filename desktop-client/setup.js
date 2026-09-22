const input = document.querySelector('#server-url');
const status = document.querySelector('#status');
const button = document.querySelector('#connect-button');
window.ch2chClient.getConfig().then(config => { input.value = config.server || ''; status.textContent = config.error || ''; }).catch(() => { status.textContent = '앱 설정을 읽지 못했습니다. 앱을 다시 실행해 주세요.'; });
document.querySelector('#connect-form').addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true;
  status.textContent = '연결 중입니다…';
  try { const result = await window.ch2chClient.connect(input.value); if (!result.ok) { status.textContent = result.error; button.disabled = false; } }
  catch { status.textContent = '연결 요청에 실패했습니다. 주소를 확인하고 다시 시도해 주세요.'; button.disabled = false; }
});
