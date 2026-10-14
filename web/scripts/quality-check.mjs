import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const { chromium, webkit } = await import(
  pathToFileURL(process.env.IMD_PLAYWRIGHT).href
);
const { default: AxeBuilder } = await import(
  pathToFileURL(process.env.IMD_AXE).href
);
const rpc = process.argv.find((x, i) => process.argv[i - 1] === "--rpc");
const root = resolve("../dist"),
  out = resolve("../test/scratch/quality");
await mkdir(out, { recursive: true });
const server = createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  let p = decodeURIComponent(u.pathname);
  if (!p.startsWith("/preview/")) return res.writeHead(404).end();
  p = p.slice(8);
  if (p.endsWith("/")) p += "index.html";
  const f = resolve(root, "." + p);
  if (!f.startsWith(root + "/")) return res.writeHead(403).end();
  try {
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webp": "image/webp",
      }[extname(f)] || "application/octet-stream",
    );
    res.end(await readFile(f));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/preview/`;
const report = { results: [], violations: [] };
let browser;
const pass = (test, detail) => {
  report.results.push({ test, passed: true, detail });
  console.log("PASS", test);
};
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  for (const route of [
    "",
    "mint",
    "pass",
    "dashboard",
    "staking",
    "swap",
    "burns",
    "launchpad",
    "community",
    "verification",
  ]) {
    await page.goto(base + "#/" + route);
    await page.locator("h1").waitFor();
    await page.waitForTimeout(150);
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    report.violations.push(
      ...r.violations.map((v) => ({
        route,
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          html: n.html,
          summary: n.failureSummary,
        })),
      })),
    );
    pass(`Axe scan ${route || "home"}`, `${r.violations.length} violations`);
  }
  await page.goto(base);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    assert(
      await page.evaluate(() =>
        document.querySelector("dialog")?.contains(document.activeElement),
      ),
    );
  }
  pass("Wallet modal traps keyboard focus");
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent),
    "Connect",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".eye-pupil")
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  pass("Reduced motion stops decorative animations");
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  pass("Home reflows at 320px with 200% root text size");
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "#/pass");
  await page
    .getByText("Browse all original artwork previews", { exact: true })
    .click();
  assert.equal(await page.locator(".art-grid img").count(), 12);
  await page
    .getByRole("button", { name: "Next artworks", exact: true })
    .click();
  await page
    .getByAltText("Genesis artwork preview 13", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "12 Standard previews", exact: true })
    .click();
  await page
    .getByAltText("Standard artwork preview 1", { exact: true })
    .waitFor();
  assert.equal(await page.locator(".art-grid img").count(), 12);
  pass(
    "Preserved Genesis and Standard gallery, pagination and category filter",
  );
  await page.goto(base + "#/mint");
  await page.screenshot({ path: out + "/mint-390.png", fullPage: true });
  await page.goto(base + "#/launchpad");
  await page.screenshot({ path: out + "/launchpad-390.png", fullPage: true });
  // Simulate RPC failure only; all local assets and the saved chain snapshot still work.
  await page.route(
    /https:\/\/(ethereum-rpc\.publicnode\.com|eth\.drpc\.org)\/?$/,
    (r) => r.abort(),
  );
  await page.goto(base);
  await page.getByText("Saved on-chain snapshot", { exact: true }).waitFor();
  assert(
    await page
      .locator(".hero-visual img")
      .evaluate((i) => i.complete && i.naturalWidth > 0),
  );
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await dialog.waitFor();
  pass(
    "Offline RPC fallback labels snapshot and keeps connect and authentic artwork usable",
  );
  await browser.close();
  browser = null;
  browser = await webkit.launch({
    headless: true,
    executablePath: process.env.IMD_WEBKIT_EXECUTABLE,
  });
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  if (rpc)
    await p.route(
      /https:\/\/(ethereum-rpc\.publicnode\.com|eth\.drpc\.org)\/?$/,
      async (route) => {
        try {
          const response = await fetch(rpc, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: route.request().postData(),
            signal: AbortSignal.timeout(30000),
          });
          await route.fulfill({
            status: response.status,
            contentType: "application/json",
            body: await response.text(),
            headers: { "access-control-allow-origin": "*" },
          });
        } catch {
          await route.abort();
        }
      },
    );
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await p.getByRole("heading", { name: "Enter BMC Illuminati" }).waitFor();
  await p.getByRole("button", { name: "Connect", exact: true }).click();
  await p.getByRole("dialog").waitFor();
  await p.keyboard.press("Escape");
  await p.getByRole("link", { name: "Explore NFT minting" }).click();
  await p.getByRole("heading", { name: "Mint a BMC Pass" }).waitFor();
  assert(await p.getByRole("button", { name: "2. Mint Genesis" }).isDisabled());
  pass("WebKit main action, wallet dialog and mint gate");
  for (const route of ["pass", "launchpad", "swap", "staking"]) {
    await p.goto(base + "#/" + route);
    await p.locator("h1").waitFor();
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
  }
  await p.goto(base + "#/pass");
  await p.locator(".nft-image").first().waitFor();
  await p.screenshot({
    path: out + "/webkit-collection-390.png",
    fullPage: true,
  });
  report.webkitErrors = errors;
  assert.equal(errors.length, 0, JSON.stringify(errors));
  pass("WebKit secondary routes render without overflow or page errors");
  await browser.close();
  browser = null;
  if (report.violations.length) process.exitCode = 1;
} catch (e) {
  report.error = e.stack;
  console.error(e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.close();
  await writeFile(
    out + "/results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
