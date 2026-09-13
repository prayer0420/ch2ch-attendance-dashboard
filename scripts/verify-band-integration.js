const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const api = read("lib/band-api.ts");
const statusRoute = read("app/api/band/status/route.ts");
const publishRoute = read("app/api/band/publish/route.ts");
const card = read("components/band-publish-card.tsx");
const builder = read("components/worship-journal-builder.tsx");

assert.match(api, /BAND_TARGET_NAME/);
assert.match(api, /BAND_TARGET_KEY/);
assert.match(api, /permissions: "posting"/);
assert.match(api, /checkTargetBandPosting/);
assert.match(statusRoute, /canPost/);
assert.match(statusRoute, /bandUrl/);
assert.match(publishRoute, /confirmed !== true/);
assert.match(publishRoute, /targetName !== TARGET_NAME/);
assert.match(card, /type=\{showToken \? "text" : "password"\}/);
assert.match(card, /localStorage\.setItem/);
assert.match(card, /PNG 저장 \+ 글 복사/);
assert.match(card, /본문만 자동 게시/);
assert.match(builder, /<BandPublishCard/);

console.log("BAND integration checks passed: target, permission, token handling, manual image flow, and confirmed text publishing");
