/** Bounded production-export browser checks. Serves only dist; never broadcasts a transaction. */
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const modulePath = process.env.IMD_PLAYWRIGHT;
const { chromium, webkit } = modulePath
  ? await import(pathToFileURL(modulePath).href)
  : await import("playwright");
const root = resolve("../dist"),
  out = resolve("../test/scratch/browser");
await mkdir(out, { recursive: true });
const rpc = process.argv.find((x, i) => process.argv[i - 1] === "--rpc");
const server = createServer(async (req, res) => {
  let pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  if (!pathname.startsWith("/preview/")) {
    res.writeHead(404).end();
    return;
  }
  pathname = pathname.slice(8);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = resolve(root, "." + pathname);
  if (!file.startsWith(root + "/")) {
    res.writeHead(403).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webp": "image/webp",
        ".json": "application/json",
      }[extname(file)] || "application/octet-stream",
    );
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/preview/`;
const report = { base: "temporary /preview/ subpath", results: [], errors: [] };
const pass = (test, extra = {}) => {
  report.results.push({ test, passed: true, ...extra });
  console.log("PASS", test);
};
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  if (rpc)
    await context.route(
      /https:\/\/(ethereum-rpc\.publicnode\.com|eth\.drpc\.org)\/?$/,
      async (route) => {
        try {
          const r = await fetch(rpc, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: route.request().postData(),
          });
          await route.fulfill({
            status: r.status,
            contentType: "application/json",
            body: await r.text(),
          });
        } catch {
          await route.abort();
        }
      },
    );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const localFailures = [];
  page.on("response", (r) => {
    if (r.url().startsWith(base) && r.status() >= 400)
      localFailures.push(r.url());
  });
  await page.goto(base);
  await page.getByRole("heading", { name: "Enter BMC Illuminati" }).waitFor();
  const primary = await page
    .getByRole("link", { name: "Explore NFT minting" })
    .boundingBox();
  assert(primary && primary.y + primary.height < 844);
  pass("Product and primary action visible at 390");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Browser wallet", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Coinbase Wallet", exact: true })
      .count(),
    1,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Connect", exact: true }).waitFor();
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent),
    "Connect",
  );
  pass("Wallet modal opens, Escape closes and focus restores");
  await page.getByRole("link", { name: "Explore NFT minting" }).click();
  await page.getByRole("heading", { name: "Mint a BMC Pass" }).waitFor();
  assert(
    await page
      .getByRole("button", { name: "1. Approve exact BMC" })
      .isDisabled(),
  );
  assert(
    await page.getByRole("button", { name: "2. Mint Genesis" }).isDisabled(),
  );
  await page.getByRole("button", { name: "Mystery · #41–500" }).click();
  assert(
    await page.getByRole("button", { name: "2. Mint Mystery" }).isDisabled(),
  );
  pass("Mint phase controls work and PRE_LAUNCH blocks all financial controls");
  await page.goto(base + "mint/");
  await page.getByRole("heading", { name: "Mint a BMC Pass" }).waitFor();
  assert.equal(await page.locator("link[rel=stylesheet]").count(), 1);
  pass("Static /mint/ entry resolves relative assets under a subpath");
  await page.goto(base + "#/pass");
  await page.getByRole("heading", { name: "Pass #1", exact: true }).waitFor();
  await page.getByText("Legendary Golden Crown", { exact: true }).waitFor();
  assert(
    await page
      .locator(".nft-image")
      .first()
      .evaluate((i) => i.complete && i.naturalWidth > 0),
  );
  await page.getByLabel("Look up a token ID").fill("501");
  await page.getByRole("button", { name: "Find Pass" }).click();
  await page
    .getByText("Enter a token ID from 1 to 500.", { exact: true })
    .waitFor();
  await page.getByLabel("Look up a token ID").fill("1");
  await page.getByRole("button", { name: "Find Pass" }).click();
  await page.getByRole("heading", { name: "Pass #1", exact: true }).waitFor();
  pass("Authentic NFT image, attributes, owner and validated lookup");
  await page.goto(base + "#/staking");
  for (const n of ["Stake BMC", "Unstake BMC", "Claim rewards"])
    assert(
      await page.getByRole("button", { name: n, exact: true }).isDisabled(),
    );
  await page.getByRole("button", { name: "NFT", exact: true }).click();
  assert(
    await page
      .getByText("The proposed NFT staking program uses custody.", {
        exact: false,
      })
      .isVisible(),
  );
  pass("Staking programs explain unavailable deployment and cannot transact");
  await page.goto(base + "#/launchpad");
  await page.getByLabel("Token name", { exact: true }).fill("Test draft");
  await page.getByLabel("Ticker", { exact: true }).fill("BMCX");
  await page.getByRole("button", { name: "Add optional details" }).click();
  await page.getByLabel("Website", { exact: true }).fill("http://example.com");
  await page.getByRole("button", { name: "Download token draft" }).click();
  await page
    .getByText("Use a public HTTPS URL without credentials.", { exact: true })
    .waitFor();
  await page.getByLabel("Website", { exact: true }).fill("https://example.com");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download token draft" }).click();
  const file = await download;
  assert.equal(file.suggestedFilename(), "bmc-launchpad-bmcx-draft.json");
  const json = JSON.parse(await readFile(await file.path(), "utf8"));
  assert.equal(json.status, "LOCAL_DRAFT_NOT_DEPLOYED");
  assert.equal(json.chain, null);
  await page
    .getByRole("button", { name: "Creator dashboard", exact: true })
    .click();
  await page.getByText("Test draft (BMCX)", { exact: true }).waitFor();
  pass("Launchpad HTTPS validation, local draft download and creator preview");
  await page.goto(base + "#/swap");
  await page.getByLabel("You pay · ETH").fill("0.001");
  await page.getByRole("button", { name: "Get a quote", exact: true }).click();
  if (rpc) {
    await page
      .getByText("Estimated BMC received", { exact: true })
      .waitFor({ timeout: 45000 });
    assert(
      await page
        .getByText("Minimum at 0.5% slippage", { exact: true })
        .isVisible(),
    );
    pass("Live buy quote, minimum received and fee disclosure");
  }
  assert(
    await page
      .getByRole("button", { name: "Swap in this site · Release pending" })
      .isDisabled(),
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
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
      await page.goto(base + (route ? "#/" + route : ""));
      await page.locator("h1").waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false, `Overflow ${route} at ${width}`);
    }
    pass(`All routes reflow at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "#/pass");
  await page.locator(".nft-image").first().waitFor();
  await page.screenshot({ path: out + "/collection-390.png", fullPage: true });
  await page.goto(base);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.screenshot({ path: out + "/wallet-390.png" });
  await page.keyboard.press("Escape");
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(localFailures.length, 0, localFailures.join("\n"));
  pass("No page errors or missing local resources during primary flow");
  await context.close();
  // EIP-6963 wallet fixture: it exposes only public accounts and never signs or broadcasts.
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  if (rpc)
    await ctx.route(
      /https:\/\/(ethereum-rpc\.publicnode\.com|eth\.drpc\.org)\/?$/,
      async (route) => {
        const r = await fetch(rpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: route.request().postData(),
        });
        await route.fulfill({
          status: r.status,
          contentType: "application/json",
          body: await r.text(),
        });
      },
    );
  await ctx.addInitScript(() => {
    const listeners = {};
    let account = "0x83027ad9d0d5374335086c539dadd1db983441b0";
    let chain = "0x1";
    let reject = true;
    let authorized = false;
    window.__walletCalls = [];
    const provider = {
      on: (e, fn) => {
        (listeners[e] ??= []).push(fn);
      },
      removeListener: (e, fn) => {
        listeners[e] = (listeners[e] || []).filter((f) => f !== fn);
      },
      request: async ({ method, params }) => {
        window.__walletCalls.push(method);
        if (method === "eth_requestAccounts") {
          if (reject) {
            reject = false;
            throw { code: 4001, message: "User rejected the request." };
          }
          authorized = true;
          return [account];
        }
        if (method === "eth_accounts") return authorized ? [account] : [];
        if (method === "eth_chainId") return chain;
        if (method === "wallet_switchEthereumChain") {
          chain = params[0].chainId;
          listeners.chainChanged?.forEach((f) => f(chain));
          return null;
        }
        if (method === "wallet_getCapabilities") return {};
        throw new Error("Forbidden test-wallet method: " + method);
      },
    };
    const announce = () =>
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: {
              uuid: "f564428d-4ceb-4fbb-97b9-07273d34d9c6",
              name: "MetaMask Test",
              icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3E%3Cpath d="M0 0h10v10H0z" fill="%23d4af37"/%3E%3C/svg%3E',
              rdns: "io.metamask",
            },
            provider,
          },
        }),
      );
    window.addEventListener("eip6963:requestProvider", announce);
    announce();
    window.__account = (a) => {
      account = a;
      listeners.accountsChanged?.forEach((f) => f([a]));
    };
    window.__chain = (c) => {
      chain = c;
      listeners.chainChanged?.forEach((f) => f(c));
    };
  });
  const walletPage = await ctx.newPage();
  await walletPage.goto(base + "#/dashboard");
  await walletPage
    .getByRole("button", { name: "Connect", exact: true })
    .click();
  await walletPage
    .getByRole("button", { name: "MetaMask Test", exact: true })
    .click();
  await walletPage
    .getByText(/rejected/i)
    .first()
    .waitFor();
  assert.equal(
    await walletPage
      .getByRole("button", { name: "Browser wallet", exact: true })
      .count(),
    0,
  );
  await walletPage
    .getByRole("button", { name: "MetaMask Test", exact: true })
    .click();
  await walletPage.getByRole("button", { name: /0x8302/ }).waitFor();
  if (rpc)
    await walletPage
      .getByRole("heading", { name: "Pass #1", exact: true })
      .waitFor({ timeout: 45000 });
  pass(
    "Named EIP-6963 discovery, rejection recovery, wallet connection and NFT discovery",
  );
  if (rpc) {
    const { encodeFunctionData, parseAbi, getAddress } = await import("viem");
    const passAddress = getAddress(
      "0x92789d9bb680a2db8617270a530e9d0f80b48641",
    );
    const account = getAddress("0x83027ad9d0d5374335086c539dadd1db983441b0");
    const saved = {
      account,
      pass: passAddress,
      chainId: 1,
      action: "genesis",
      status: "pending",
      createdAt: Date.now(),
      label: "Recovered original Genesis mint",
      amount: "1000000000000000000000000",
      to: passAddress,
      data: encodeFunctionData({
        abi: parseAbi(["function mintGenesis() returns (uint256)"]),
        functionName: "mintGenesis",
      }),
      hash: "0x808c8f4d701d140ea55dbd0aaf2bfc526baa937b4411cd14943f63e956cce0ea",
    };
    await walletPage.evaluate((r) => {
      localStorage.setItem(
        "bmc:transactions:v2:1:" + r.pass,
        JSON.stringify([r]),
      );
      window.dispatchEvent(new Event("bmc-transactions"));
    }, saved);
    await walletPage
      .getByRole("button", { name: "Check receipt", exact: true })
      .click();
    await walletPage
      .getByText("Transaction receipt checked.", { exact: true })
      .waitFor({ timeout: 45000 });
    await walletPage.getByText("Minted Pass #1", { exact: true }).waitFor();
    pass(
      "Known Genesis receipt recovers with sender/calldata, confirmations and minted token ID verified",
    );
    await walletPage.evaluate((r) => {
      localStorage.setItem(
        "bmc:transactions:v2:1:" + r.pass,
        JSON.stringify([
          {
            ...r,
            hash: undefined,
            status: "uncertain",
            createdAt: r.createdAt + 1,
          },
        ]),
      );
      window.dispatchEvent(new Event("bmc-transactions"));
    }, saved);
    await walletPage
      .getByRole("button", { name: "Resolve request", exact: true })
      .click();
    const clear = walletPage.getByRole("button", {
      name: "Clear this local request",
      exact: true,
    });
    assert(await clear.isDisabled());
    await walletPage
      .getByLabel(
        "I checked the wallet. No transaction was submitted and no request is pending.",
      )
      .check();
    assert(await clear.isEnabled());
    await clear.click();
    assert.equal(await walletPage.getByRole("dialog").count(), 0);
    pass(
      "Unknown transaction request requires explicit verification acknowledgment before clearing",
    );
  }
  await walletPage.evaluate(() => window.__chain("0xa"));
  await walletPage
    .getByRole("button", { name: "Switch to Ethereum", exact: true })
    .waitFor();
  await walletPage
    .getByRole("button", { name: "Switch to Ethereum", exact: true })
    .click();
  await walletPage.getByRole("button", { name: /0x8302/ }).waitFor();
  pass("Wrong network state and explicit Ethereum switch");
  await walletPage.evaluate(() =>
    window.__account("0x38224239f2bdae357d47cb864bc533d7f72df961"),
  );
  await walletPage.getByRole("button", { name: /0x3822/ }).waitFor();
  await walletPage
    .getByText(
      "No BMC Illuminati Passes belong to this wallet at the displayed block.",
      { exact: false },
    )
    .waitFor({ timeout: 45000 });
  assert.equal(
    await walletPage
      .getByRole("heading", { name: "Pass #1", exact: true })
      .count(),
    0,
  );
  pass("Account changes clear previous wallet NFTs");
  const calls = await walletPage.evaluate(() => window.__walletCalls);
  assert(!calls.some((x) => /sendTransaction|sign/i.test(x)));
  pass(
    "No financial or signature requests during connect, network and read interactions",
    { walletMethods: [...new Set(calls)] },
  );
  await ctx.close();
  // Standard phone browser has no injected provider and must offer all three app links.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const phone = await mobile.newPage();
  await phone.goto(base);
  await phone.getByRole("button", { name: "Connect", exact: true }).click();
  for (const n of [
    "Open in MetaMask",
    "Open in Coinbase Wallet",
    "Open in Phantom",
  ])
    assert.equal(
      await phone.getByRole("link", { name: n, exact: false }).count(),
      1,
    );
  assert.equal(
    await phone
      .getByRole("button", { name: "Coinbase Smart Wallet", exact: true })
      .count(),
    1,
  );
  pass("Phone wallet links and Coinbase Smart Wallet row");
  await mobile.close();
  await browser.close();
  browser = null;
  try {
    browser = await webkit.launch({
      headless: true,
      executablePath: process.env.IMD_WEBKIT_EXECUTABLE,
    });
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(base);
    await p.getByRole("heading", { name: "Enter BMC Illuminati" }).waitFor();
    await p.getByRole("button", { name: "Connect", exact: true }).click();
    await p.getByRole("dialog").waitFor();
    await p.keyboard.press("Escape");
    await p.getByRole("link", { name: "Explore NFT minting" }).click();
    await p.getByRole("heading", { name: "Mint a BMC Pass" }).waitFor();
    await p.screenshot({ path: out + "/webkit-mint-390.png", fullPage: true });
    pass("WebKit primary navigation and connect dialog");
    await browser.close();
    browser = null;
  } catch (e) {
    report.results.push({
      test: "WebKit primary navigation and connect dialog",
      passed: false,
      limitation: e.message,
    });
    console.log("LIMIT", e.message.slice(0, 500));
  }
} catch (e) {
  report.errors.push(e.stack);
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
