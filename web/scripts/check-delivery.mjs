/** Inspect deliverable paths/bytes without reading Git internals or dependency directories. */
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const excluded = new Set(["node_modules", ".vite", ".cache", ".npm", ".pnpm-store", "coverage"]);
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name), name = relative(root, path);
    if (dir === root && [".git", ".imd"].includes(entry.name)) continue;
    if (name === "test/scratch" || excluded.has(entry.name) || entry.name.endsWith(".tsbuildinfo")) continue;
    assert(![".git", ".github"].includes(entry.name), `Unexpected nested repository/automation: ${name}`);
    assert(!/^\.env(?:\.|$)/.test(entry.name), `Environment file is not a deliverable: ${name}`);
    assert(!entry.isSymbolicLink(), `Unexpected symlink: ${name}`);
    if (entry.isDirectory()) await walk(path);
    else {
      assert(!/\.(tgz|zip|tar|gz)$/.test(entry.name), `Unnecessary archive: ${name}`);
      files.push({ name, path, bytes: (await stat(path)).size });
    }
  }
}
await walk(root);
const total = files.reduce((n, f) => n + f.bytes, 0);
assert(total <= 8388608, `Bundle exceeds 8 MiB: ${total}`);
assert((await stat(resolve(root, ".gitignore"))).size <= 512);
const hash = (data) => createHash("sha256").update(data).digest("hex");
let assets = 0;
for (const f of files.filter((f) => f.name.startsWith("web/public/"))) {
  const exported = resolve(root, "dist", f.name.slice("web/public/".length));
  assert.equal(hash(await readFile(f.path)), hash(await readFile(exported)), `Asset changed/missing: ${f.name}`);
  assets++;
}
for (const name of ["dist/index.html", "dist/mint/index.html"]) {
  const path = resolve(root, name), html = await readFile(path, "utf8");
  for (const required of ["<title>", 'name="description"', 'property="og:title"', 'property="og:image"', 'rel="icon"', 'Content-Security-Policy'])
    assert(html.includes(required), `${name}: missing ${required}`);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert(/^\.\.?\//.test(match[1]), `${name}: asset must be relative: ${match[1]}`);
    await stat(resolve(dirname(path), match[1]));
  }
}
for (const path of ["README.md", "DESIGN.md", "REVIEW.md", "docs/VALIDATION.md", "web/package-lock.json"])
  await stat(resolve(root, path));
const byRoot = {};
for (const f of files) {
  const group = f.name.split("/")[0];
  byRoot[group] = (byRoot[group] || 0) + f.bytes;
}
console.log(JSON.stringify({ passed: true, files: files.length, bytes: total, cap: 8388608, spare: 8388608 - total, matchingPublicAssets: assets, byRoot }, null, 2));
