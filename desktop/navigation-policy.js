const path = require("node:path");
const { pathToFileURL } = require("node:url");

const dashboardOrigin = "http://127.0.0.1:3000";
const launcherUrl = pathToFileURL(path.join(__dirname, "renderer", "index.html")).href;
const externalHosts = new Set(["docs.google.com", "drive.google.com", "accounts.google.com", "band.us", "www.band.us", "auth.band.us"]);

function isLauncherUrl(value) {
  try { const url = new URL(value); url.hash = ""; return url.href === launcherUrl; } catch { return false; }
}
function isAppUrl(value) {
  try { const url = new URL(value); return !url.username && !url.password && url.origin === dashboardOrigin; } catch { return false; }
}
function isAllowedExternalUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.port && externalHosts.has(url.hostname); } catch { return false; }
}
function isTrustedIpc(event, webContents) {
  // Only the packaged launch screen needs process-management privileges.
  return Boolean(webContents && event.sender === webContents && event.senderFrame && event.senderFrame === webContents.mainFrame && isLauncherUrl(event.senderFrame.url));
}
module.exports = { dashboardOrigin, isLauncherUrl, isAppUrl, isAllowedExternalUrl, isTrustedIpc };
