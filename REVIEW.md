# Security and release review

This is the implementing worker's review, dated 2026-10-14. It is **not an independent audit**, and no independent approval has been inferred from tests, repository names, `mintingOpen`, or this report. The deployed NFT was not modified. The static frontend is usable; financial release remains incomplete.

## Findings and disposition

| Finding | Evidence / scope | Disposition |
| --- | --- | --- |
| Website selected a different NFT deployment | Original main-repository website configuration versus `ownerOf(1)`, creation and mint receipts | Fixed in `web/src/config.ts`. Only the task's official collection is integrated. |
| Genesis image gateway unavailable | Dedicated gateway 403; public Pinata returned the same immutable CID/file | Fixed for the website with a local lossless encoding of the authentic artwork and verified pixel hash. External wallet caching is not repaired by this change. |
| Previous full-runtime mismatch included compiler metadata | Executable-byte comparison at the pinned source revision | Reconciled, not waived: all executable bytes match, complete actual runtime hashes are pinned. Explorer verification is still unconfirmed. |
| NFT outcome randomness is not verifiable randomness | `BMCIlluminatiPass._draw`, future-block reveal / timeout design; Slither `weak-prng` | Unresolved design risk. Block producers and transaction timing can influence outcomes; delayed/forced reveal introduces additional assumptions. Never describe outcomes as VRF-secured or unbiased. Independent review and explicit risk disposition remain required. |
| Slither NFT reentrancy findings | `_burnExact`, `mintGenesis`, `mintMystery` | Canonical BMC is immutable and matched to a plain ERC20Burnable; external mint functions use `nonReentrant`, and exact balance/supply deltas are checked. These mitigate the generic detector scenario. Worker analysis is not independent acceptance; findings remain disclosed. |
| Slither dependency arithmetic findings | OpenZeppelin `Math.mulDiv`, `Math.invMod`, Base64 | XOR in the modular-inverse seed is intentional; divisions/multiplications implement full-precision arithmetic or encoded-length rounding. Likely detector false positives, subject to pinned-dependency review. No suppression added and no “zero findings” claim. |
| NFT strict-equality findings | Zero `blockhash` detection and zero sentinel slot | Intentional unavailable-hash/sparse-shuffle checks; changing equality would change behavior. Review with the randomness/timeout model. |
| No authenticated staking deployment or funding | Supplied staking repo and its deployment records | Read-only interface; no guessed address, deposit, approval, withdrawal or reward claim. Source tests alone cannot validate a deployment. |
| Staking Slither findings | `BMCStaking._receiveBMC`, `_sendBMC`, `_earned`, dependency math | External value-moving entry points are guarded; `_earned` modulo retains fractional rewards and is not a random generator. SafeERC20's generic low-level call triggered ETH/reentrancy detectors. These observations are not independent clearance. No staking funds are accepted. |
| Staking NFT custody differs from ownership proof | Imported `stakeNFT` actually transfers an NFT into custody | Not used for VIP eligibility. Holder utility reads `ownerOf`; no NFT approval or transfer control exists in the site. |
| IMD infrastructure / claims / launchpad not verified | No authorized chain deployment, bridge, router, funded campaign or claim contract established | Draft-only UI. No chain ID, recipient, treasury, token wrapper or yield invented. |
| Unknown official X and Telegram URLs | No confirmed accounts in supplied project records | Unconfigured links labelled as awaiting confirmation. Optional clarification requested; no URL invented. |

## Static analysis actually run

Slither 0.11.6 was run against each retrieved source tree with informational, optimization and low findings excluded, without dependency exclusions or detector suppressions. Both commands exited **255**, indicating findings, not a clean result.

| Source | High | Medium | Total |
| --- | ---: | ---: | ---: |
| Main NFT revision | 3 | 14 | 17 |
| Staking revision | 7 | 9 | 16 |

The NFT High detectors were `weak-prng`, `incorrect-exp`, and `reentrancy-balance`. Staking High detectors were three `reentrancy-balance`, two `reentrancy-eth`, one `weak-prng`, and one `incorrect-exp`. Medium categories and exact source locations/descriptions are preserved in `docs/evidence/*-static-analysis.json`. Their `success: true` field means the analyzer completed, **not** that findings passed. The assignment is a frontend delivery under the none profile, not a clean Foundry launch submission.

## Frontend controls

- `releaseBlockers` and `assertReleased` stop actions before wallet access. The shipped record remains `PRE_LAUNCH` with explorer verification and independent acceptance false. UI state alone is not the gate.
- Ethereum chain ID, full NFT/BMC runtime hashes, immutable BMC, supply cap, phase prices, decimals and Genesis CID are verified. Wallet account/network are rechecked immediately before signing.
- Approvals authorize exactly one current mint price. A different nonzero allowance must be explicitly reset to zero. Every approval, mint or reveal has its own simulation, review and user confirmation. No hidden signatures, transfers or maximum allowances.
- Preparation performs `eth_call` and gas estimation. Submission repeats live checks and expires the review after 60 seconds. The wallet remains responsible for the final gas quote and consent.
- Web Locks serialize tabs. An unresolved record is persisted before a wallet request; storage failure prevents submission. Recovery checks sender, contract, calldata, canonical receipt block and two confirmations. Ambiguous wallet errors remain locked.
- Token amounts use bigint; a bounded ownership scan compares discovered IDs with `balanceOf`. Account-specific query keys prevent showing a previous account's NFT list after a switch.
- Metadata is bounded, decoded as data and rendered by React. No HTML insertion, arbitrary remote metadata script, NFT approval or seed-phrase input. Standard SVG is loaded only as an image. URL fields require HTTPS without credentials.
- CSP restricts scripts to local bundles, disallows objects/forms, and limits RPC, artwork and Coinbase connections. No eval or inline executable script is required. Inline styles remain allowed for React/Coinbase UI. Hosting-level `frame-ancestors` must be configured by the publisher: browsers do not enforce it in a meta tag.
- Dependency versions are locked; the observed npm audit returned zero vulnerabilities. This is point-in-time database coverage, not proof that every dependency is safe.

## Tests and practical limits

The imported NFT suite passed 80 tests with four existing optional fork tests skipped; the staking suite passed 81. Three additional tests against the **actual deployed NFT at block 26187055** passed: Genesis mint burns the exact amount and consumes allowance; insufficient allowance reverts atomically; remaining Genesis slots followed by Mystery mint and future-block reveal work. Fork balances were test-funded and no transaction was broadcast. These checks cannot prove fairness or every adversarial execution.

Frontend safety and browser tests are recorded in `docs/VALIDATION.md`. No real wallet signature, live approval/mint, real phone handoff, Coinbase passkey session, independent audit, staking deposit, swap execution or claim was performed. Receipt tracking is browser-local and bounded to 50 records. Wallet-replaced transactions need manual verification; a dropped/replaced known hash is not automatically assumed cancelled. Clearing browser storage loses local recovery records, so wallet/explorer history remains authoritative.

Public RPCs can be unavailable or malicious; hashes detect mismatched known bytecode but are not light-client proofs. Displayed blocks can reorganize. Recent activity covers the labelled 5,000-block window and BMC/Pass events, not all lifetime ETH/internal transactions. Saved values remain visibly historical. No UI value is presented as guaranteed yield, USD valuation, funded airdrop or verified IMD burn.
