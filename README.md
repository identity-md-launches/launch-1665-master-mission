# BMC Illuminati

A static React + Vite + TypeScript dapp preserving the existing black-and-gold BMC design, emblem, slogan and artwork. The publishable export is **`dist/`**, including an explicit **`dist/mint/index.html`** entry. It works at a gateway subpath using relative assets and hash navigation.

## What works

- Authentic Legendary Genesis #1, its on-chain metadata, nine attributes, owner, mint receipt and burn evidence. The site now reads the requested NFT address, not the other empty deployment previously selected by the website.
- Live Ethereum collection state, BMC supply/burn totals, ETH/BMC wallet balances, all owned Passes, NFT lookup and bounded on-chain transaction history. Every read has a block/time or a clearly labelled historical snapshot.
- EIP-6963 browser-wallet discovery, mobile wallet-browser links, Coinbase Wallet/Smart Wallet, account changes, explicit Ethereum switching, rejection recovery and disconnect.
- Exact-amount approval/mint/reveal transaction implementation with simulation, review, account/network revalidation, persistent submission locks and receipt recovery. **Production writes remain gated.**
- Live Uniswap v4 buy/sell quotes, slippage minimums and actual pool/hook fee reads. An external Uniswap link is available; in-site swap execution remains disabled.
- Read-only staking, a downloadable local launchpad draft, holder-benefit status, verified project updates, all 77 existing Genesis previews and 12 existing Standard previews.

## Financial release status

This delivery is **not an independently audited financial launch**. `web/src/config.ts` retains `PRE_LAUNCH`; the source/ABI/address reconciliation and deployed mint tests do not waive the outstanding NFT explorer-verification and independent-review requirements. The assignment supplies conditional integration authorization; no additional owner-opening transaction is necessary or sent. Static analysis findings are disclosed in [REVIEW.md](REVIEW.md).

No genuine deployed staking address or funded holder campaign was found in the supplied project records. IMD-chain trading infrastructure, genuine cross-chain assets, launchpad contracts and burn routes remain unverified. Those operations cannot collect funds. Official X/Twitter and Telegram accounts were not confirmed; their links are deliberately unconfigured pending the owner's URLs.

The website image is fixed. The NFT's deployed metadata and contract are unchanged. MetaMask's own IPFS gateway/cache is outside this site's control, so its thumbnail cannot be guaranteed by a website change.

## Install, build and preview

Use Node 22.12+ and npm. No environment file, credentials, wallet keys or project ID is needed.

```sh
cd web
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

Vite prints the local preview URL. Open the root, `/#/pass`, `/#/dashboard`, and `/mint/`. `npm run dev` starts the development server. `npm run build` typechecks, produces the root `dist/`, and exports the static mint entry. The publisher serves these bytes; it does not rebuild them.

The build itself makes no network requests. With the npm packages already cached, `npm ci --offline --cache <your-cache-directory>` also installs from the lockfile. The source, manifest, lockfile and complete runtime artwork are delivered; npm caches and `node_modules` are not. Live RPC reads and wallet services naturally need network access at runtime. If an RPC fails, public snapshots are labelled as historical and wallet failures expose retry controls.

## Checks and evidence

Actual results and limitations are in [docs/VALIDATION.md](docs/VALIDATION.md). The production build, typecheck, safety tests, Chromium interaction checks, accessibility scan, design probe, mainnet-fork contract tests and imported-source tests were run. Source-level checks and the worker's report are **not independent certification**.

Optional browser checks use Playwright installed outside this repository:

```sh
# From web/; set these to your installed modules, not to a wallet or credential.
IMD_PLAYWRIGHT=/path/to/playwright/index.mjs \
  node scripts/browser-check.mjs --rpc https://ethereum-rpc.publicnode.com
IMD_PLAYWRIGHT=/path/to/playwright/index.mjs \
IMD_AXE=/path/to/@axe-core/playwright/dist/index.mjs \
  node scripts/quality-check.mjs --rpc https://ethereum-rpc.publicnode.com
```

`IMD_WEBKIT_EXECUTABLE` optionally selects a local WebKit launcher when system libraries require it. Test servers run only for the bounded scripts and close afterward. Browser wallet fixtures expose public addresses only and never sign or broadcast. The scripts save temporary output under `test/scratch/`, which is not part of the submission.

The pinned design probe is provided by the job, not by this repository. During the assignment it is run from the repository root:

```sh
IMD_PLAYWRIGHT=/path/to/playwright/index.mjs \
  node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

## Source layout

| Path | Purpose |
| --- | --- |
| `web/src/App.tsx` | Preserved page structure, routes, dashboard, collection, staking, burns, community |
| `web/src/config.ts` | Ethereum addresses, typed ABI subset, public RPCs, wallet connectors, release gate |
| `web/src/data.ts` | Runtime verification, coherent block reads, ownership pagination, event history |
| `web/src/metadata.ts` | Bounded metadata decoding and artwork allowlist |
| `web/src/Mint.tsx`, `transactions.ts` | Review flow, exact approvals, simulation, persistent pending records |
| `web/src/Swap.tsx` | Verified v4 pool reads and read-only quoter integration |
| `web/src/Launchpad.tsx` | Local draft export, explicit future status and holder utility boundaries |
| `web/src/Wallet.tsx` | Native modal, focus management, browser/mobile/Coinbase connection |
| `web/src/preserved.css`, `gold.css`, `app.css` | Original visual system followed by scoped functionality adjustments |
| `web/public/artwork/` | Full-resolution lossless Genesis #1 and preserved previews |
| `docs/evidence/` | Public chain/source/artwork/quote/static-analysis evidence |
| `docs/abi/` | Generated full NFT ABI and verified BMC ABI |
| `DESIGN.md`, `REVIEW.md` | Implemented design system and security/release review |

Read [docs/CHAIN-VERIFICATION.md](docs/CHAIN-VERIFICATION.md), [docs/RELEASE.md](docs/RELEASE.md), and [docs/FUTURE-INTEGRATIONS.md](docs/FUTURE-INTEGRATIONS.md) before enabling any new financial action. Nothing here deploys, opens minting, publishes a site, funds a program or modifies a deployed contract.

Final delivery integrity check: `node web/scripts/check-delivery.mjs` from the repository root. It verifies relative export assets and the complete source/export byte budget; the recorded result is `docs/evidence/delivery.json`.
