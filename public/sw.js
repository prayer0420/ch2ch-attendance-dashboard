/* No API, attendance, accounting, or authenticated document caching.
 * No background sync: an interrupted submission must be checked by the user. */
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CH2CH · 연결 필요</title><body style="margin:0;background:#f7f2e8;color:#20211d;font:16px/1.8 system-ui;padding:40px 24px"><main style="max-width:440px;margin:auto"><h1>인터넷 연결이 필요합니다</h1><p>개인정보 보호를 위해 출석·회계자료를 오프라인에 저장하지 않습니다.</p><p>제출 중 연결이 끊겼다면 다시 제출하기 전에 저장 결과를 확인해 주세요. 자동으로 재전송하지 않습니다.</p><a href="/" style="display:inline-block;padding:12px 20px;background:#2e6f73;color:white;border-radius:8px">다시 연결</a></main></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" } }
  )));
});
