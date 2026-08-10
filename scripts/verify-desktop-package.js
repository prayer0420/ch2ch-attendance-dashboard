const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

assert.equal(pkg.main, "desktop/main.js");
assert.match(pkg.scripts["desktop:dev"], /electron/);
assert.match(pkg.scripts["desktop:dist"], /electron-builder/);
assert.equal(pkg.build.nsis.oneClick, false);
assert.ok(pkg.build.files.includes("desktop/**/*"));
assert.ok(pkg.build.extraResources.some((entry) => entry.to === "project"));
assert.equal(pkg.build.extraResources.some((entry) => entry.filter.includes("!.env.local")), true);

for (const file of ["desktop/main.js", "desktop/preload.js", "desktop/renderer/index.html", "desktop/renderer/renderer.js"]) {
  assert.equal(fs.existsSync(path.join(root, file)), true, `${file} missing`);
}

console.log("desktop package checks passed");
