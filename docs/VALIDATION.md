# Validation record — 2026-10-14

These are checks performed by the implementing worker, not independent certification. Execution profile: frontend / none. Source and finished static export are delivered together; the publishing worker handles Git submission and hosting. No deployment, live financial transaction or site publication was performed.

## Build and reproducibility

| Check | Actual result |
| --- | --- |
| `cd web && npm run typecheck` | Passed (`tsc --noEmit`); also runs in every production build |
| `cd web && npm test` | 18 passed, 0 failed, 0 skipped |
| `cd web && npm run build` | Passed; Vite 7.3.7, 2,040 modules transformed, static root and `/mint/` entries exported |
| Clean source copy, `npm ci --offline --cache <existing-cache> --no-audit --fund=false`, then build and test | Passed; 54 packages installed from cached lockfile; no dependency directory copied; 18 tests passed |
| Clean export comparison | All 98 files byte-identical to the delivered `dist/` |
| `npm audit --json` | Zero reported vulnerabilities; report retained in `evidence/npm-audit.json` |
| Canonical full NFT ABI hash | Exactly matches `SOURCE_ABI_SHA256` |
| Original preview comparison | All 77 Genesis and 12 Standard files byte-identical to the pinned main repository |
| Authentic Genesis conversion | Original PNG and local lossless WebP decode to the same RGBA SHA-256; see `evidence/artwork.json` |

Build warnings were limited to ignored package-level `use client` directives and removed misplaced `/*#__PURE__*/` comments in the Coinbase SDK's dependency. They did not fail typechecking/building or browser checks. The main JS chunk is approximately 693 kB (214 kB gzip); the separate Coinbase SDK chunk is approximately 320 kB (97 kB gzip). CSS is approximately 43 kB (9 kB gzip). No source maps or dependency archives are shipped. Main Genesis artwork remains a 2,052,792-byte full-resolution lossless asset; smaller original previews load lazily in the gallery. This prioritizes authentic artwork over lossy replacement.

The clean offline check used a new directory outside the repository and a previously populated npm cache. It proves the build does not fetch external assets or require secrets; it does not claim a machine without dependencies/cache can install packages without a network. The submitted lockfile is the source of dependency resolution.

## Browser interactions

Playwright 1.58.2 Chromium and WebKit rendered the **production export** beneath `/preview/`, including `/preview/mint/`, using a bounded static server. Browser tools were installed outside the repository. Chain-dependent checks forwarded public-RPC requests to the worker-provided Ethereum relay, without changing source configuration. Wallet fixtures supplied public accounts only; unknown signing/send methods throw. The optional `--rpc` switch takes a public endpoint for reproduction.

```sh
# From web/, with external Playwright installed:
IMD_PLAYWRIGHT=/path/to/playwright/index.mjs \
  node scripts/browser-check.mjs --rpc https://ethereum-rpc.publicnode.com
IMD_PLAYWRIGHT=/path/to/playwright/index.mjs \
IMD_AXE=/path/to/@axe-core/playwright/dist/index.mjs \
  node scripts/quality-check.mjs --rpc https://ethereum-rpc.publicnode.com
```

**21 interaction groups passed**, with no primary-flow page errors or missing local resources. Detailed results: `evidence/browser-checks.json`.

- Product and mint exploration action visible in the first 390px screen; wallet opens, Escape closes, focus returns.
- Genesis/Mystery selection works; PRE_LAUNCH blocks approval/mint/reveal. Explicit static `/mint/` route resolves all relative assets at a subpath.
- Authentic image renders; attributes/owner load; invalid NFT lookup is rejected. Staking tabs remain useful and cannot transact.
- Launchpad rejects invalid HTTPS data, produces a local draft download and renders the creator preview. No deployment/funding is implied.
- Actual on-chain buy quote loads with minimum received and disclosed fees.
- All ten routes have no horizontal overflow at 320, 390, 768 and 1440px.
- Named EIP-6963 discovery, rejected connection retry, connected wallet and actual owned NFT discovery work.
- A saved record for the real Genesis mint receipt recovers with sender/calldata binding, confirmations and minted ID #1. An unknown request cannot be cleared until the explicit verification checkbox is selected.
- Network changes expose explicit Ethereum switching; account changes remove the former account's NFT list. No signature or financial method is called by connection/read flows.
- Phone user-agent shows MetaMask, Coinbase Wallet and Phantom handoff links plus Coinbase Smart Wallet. WebKit navigation/connect works.

**17 quality groups passed**, including Axe on every route with **zero WCAG A/AA violations reported**, keyboard focus containment, reduced motion, 320px/200% root-text reflow, all original gallery categories/pagination, RPC-offline snapshot fallback, and WebKit secondary pages without overflow or page errors. Results: `evidence/quality-checks.json`.

WebKit initially emitted access-control errors when reaching public RPCs directly from its sandbox; the public endpoint's CORS headers were checked and the chain-backed WebKit run succeeded using the provided relay. This is recorded as a test-environment/network limitation, not a claim that every production mobile network was exercised. Actual iOS/Android installed-app handoff, MetaMask extension signing and Coinbase passkey/Smart Wallet sessions were not performed.

## Better Interface and design review

Read and applied the pinned Better Interface workflow, core principles in all six domains, relevant supporting sections and the design-documentation workflow. The design critic supplements functional/security testing; its pass is not an audit. The user's preserved brand is authoritative.

Final requested probe, from the repository root:

```sh
IMD_PLAYWRIGHT=/path/to/playwright/index.mjs \
  node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

**16/16 passed.** Measured at 320, 390 and 1440px: no horizontal scroll, overlapping text, covered text or clipping; measured text meets 4.5:1 (3:1 large); five visible type sizes per width, three families and three weights; title/favicon/description/og:title/og:image present; no remaining animation under reduced motion. All 24 home-page controls met the 24px-or-spacing threshold; 15 secondary links were below the 44px comfort target. Primary buttons, form fields and wallet rows meet or exceed 44px. The full probe screenshots remain temporary by design; compact results are retained in `evidence/design-probe.json`.

The worker visually inspected final 390px and 1440px home screenshots, the full mobile mint page, and WebKit's full mobile collection page. The first 390px screen shows the product and gold mint exploration action; the authentic artwork renders; the final screenshots preserve the black/gold identity and readable owner/attribute layout.

| Domain | Without-browser review | Rendered coverage and findings/fixes |
| --- | --- | --- |
| Accessibility | Native roles, one h1 per route, skip link, visible labels, alt text, status regions, focus and reduced-motion rules | `web/src/Wallet.tsx:34`: repeated Tab exposed a focus escape; added explicit first/last wrapping, Escape and focus restoration. Final keyboard checks and all-route Axe passed. `App.tsx:1237` skip link and route focus are implemented. Full assistive-technology audit remains unperformed. |
| Layout | Grouped controls, minmax grids, wrapping addresses, fixed content maximum, no hidden global overflow | `web/src/app.css:577`: responsive header, stacked panels and mobile sheet; every route passed four widths. `app.css:177` address wrapping and `:795` gallery grids retained long addresses/artwork without overflow. 200% root text reflow passed on home. |
| Writing | Plain headings/actions; truthful empty/loading/error states; no unsupported price/yield claims | `web/src/App.tsx:71`: four-word hero plus plain product line and visible action. `Mint.tsx` explains release gate and burn irreversibility. `data.ts:205` rejects ambiguous token IDs. Social accounts remain explicitly unconfirmed. |
| Typography | Six-size token scale, three families/weights, system fonts, tabular numbers | `web/src/gold.css:29` and `app.css:3`: consolidated tokens; probe measured five sizes per viewport. No tracked-capital eyebrow labels or clipped headings. |
| Colors | Semantic gold/dark tokens, text plus color status, focus/error contrast | `web/src/gold.css:2`: retained brand palette with readable secondary text and control borders. Probe measured all sampled text above its contrast thresholds; Axe found no route violations. Forced-colors CSS is present but a real high-contrast OS session was not exercised. |
| UI | Consistent buttons/fields, explicit transaction review, semantic dialogs, loading/retry and disabled reasons | `web/src/Mint.tsx:135`: uncertain-request acknowledgment is React state, reset each time; recovery/acknowledgment browser checks passed. `metadata.ts:10` validates bounded data before rendering. `App.tsx:204` preserved gallery previews labelled separately from minted NFTs; category/pagination passed. |

No applicable failed first-screen or repeated-page probe check remains. Readable secondary inline links are intentionally retained within the existing design; they meet spacing/24px criteria while larger action controls receive larger targets. Six-domain coverage is a review record, not a promise of perfect accessibility or device coverage. Final implemented values/components/breakpoints are in root `DESIGN.md`.

## Contract evidence and limitations

At the pinned source revisions in `CHAIN-VERIFICATION.md`, the imported NFT suite ran offline with a recorded fuzz seed and 256 runs: **80 passed, 4 conditional tests skipped, 0 failed**. The staking suite: **81 passed, 0 failed**. Three additional tests in `docs/LiveDeployedPass.t.sol` ran on a mainnet fork at block 26187055 and all passed. They exercised the requested actual deployed address, exact burns, atomic failure and Mystery reveal after the phase transition, without broadcasting.

Representative reproduction commands, in separately retrieved source trees:

```sh
forge test --offline --no-match-contract LiveDeployedPassTest --fuzz-seed 0x5018 --fuzz-runs 256
# Copy docs/LiveDeployedPass.t.sol into the pinned NFT tree's test/ first:
forge test --match-contract LiveDeployedPassTest --fork-url https://ethereum-rpc.publicnode.com --fork-block-number 26187055 -vv
slither . --exclude-informational --exclude-optimization --exclude-low
```

Slither 0.11.6 completed with findings and exit 255: NFT **3 High + 14 Medium**, staking **7 High + 9 Medium**. It did **not** pass a zero-High security gate. Findings/dispositions are in `REVIEW.md`; raw descriptions are retained in evidence. No source/deployment relationship, independent audit or live funding is inferred from passing tests. The older VRF NFT repository is not used as the deployed ABI.

Unperformed or unavailable: independent review acceptance; confirmed NFT explorer source verification; a full end-to-end live wallet approval/mint/reveal; approved staking deployment/funding; authenticated IMD chain/bridge/assets; swap router send path; funded claims and cross-chain proof; official X/Telegram confirmation. Financial actions stay gated accordingly. The site cannot force MetaMask's own metadata cache to refresh. No fabricated yield, market valuation, IMD burn or allocation is shown.

## Delivery integrity

Run `node web/scripts/check-delivery.mjs` from any directory. It checks the 8 MiB cap, explicit ignore-file budget, required documentation/lockfile, both HTML entrypoints, relative asset existence and exact source/export asset equality. It does not read Git internals or dependency directories. Generated dependencies/caches, research trees, screenshots and temporary test outputs are excluded. The source/export keep all required runtime assets and no nested Git repository or package archive.

Final measured path/byte results are recorded in `evidence/delivery.json`. `docs/PATH-BUDGET.md` reserves every delivered category within 8,388,608 bytes. The worker can submit these source/export files; this run did not modify `.git/` or perform publication.
