# Financial release record

The task authorizes integration conditional on documented validation and existing launch checks. That authorization is already recorded; the remaining gate is evidence, not a repeated request for permission. Do not switch the release mode merely because `mintingOpen()` is true.

## Current state

| Requirement | Status |
| --- | --- |
| Official mainnet collection / BMC / founder relationship | Reconciled with code, creation and mint receipts |
| Source implementation and complete ABI | Executable match; generated ABI recorded |
| Full actual runtime pins | Recorded and checked before reads/actions |
| Exact Genesis/Mystery burn on actual deployed code | Three mainnet-fork tests passed |
| Existing source suite | 80 passed, 4 conditional tests skipped; separate fork coverage recorded |
| Explorer source verification | Unconfirmed; NFT Sourcify 404 and no verified Etherscan source retrieved |
| Independent review acceptance | Missing; static analysis includes unresolved randomness risk |
| Website mode | `PRE_LAUNCH`; approve, revoke, mint and reveal disabled |

No owner transaction, deployment or publication was sent. The deployed minting flag is unchanged. `RELEASE` in `web/src/config.ts` is the single public release record. `transactions.ts` enforces it even if callers bypass the visual disabled buttons.

## Evidence needed for release

1. Complete source verification of the exact mainnet contract, including compiler metadata/settings and constructor immutable. Preserve the distinction between executable equivalence and explorer verification.
2. Obtain an independent review of the pinned block-random design, permissionless reveal queue, reveal window/timeout, exact-burn checks, owner controls and callbacks. Record each static-analysis disposition and accepted residual risk. Review must address the actual deployed design, not the older Chainlink repository.
3. Re-run the deployed-code fork harness, source suite, frontend safety tests and wallet simulation/review/recovery checks against the candidate export. Include phase transition, sold out, owner-closes-minting, stale quote, RPC failure, account/network changes, insufficient funds/allowance and replacement handling. Expand end-to-end transaction tests with a disposable local chain before release.
4. Review the evidence and update the checked-in release record with the verified source and acceptance artifact. The existing conditional user authorization does not allow inventing a review or marking a false flag true. Build the static export from the reviewed tree.

The task explicitly forbids modifying the deployed NFT. If the independent reviewer rejects its randomness or other immutable behavior, keep this deployment read-only; any replacement contract would be a separate authorized project, not a silent address substitution.

## Separate feature gates

- **Staking:** authenticated deployment, actual treasury/collection configuration, funded reserves, exact source/runtime match, permissions and withdrawals verified; independent acceptance and explicit activation evidence. No placeholder treasury.
- **Swap sends:** reviewed router and hook execution path, exact allowances, protected minimum received/deadline, native ETH refund/accounting, simulation, fee disclosure and transaction lifecycle tests. The current quoter is read-only.
- **Launchpad / claims:** the infrastructure, contracts and funding criteria in `FUTURE-INTEGRATIONS.md`. They are not enabled by the NFT release flag.
- **Social links:** only confirmed project URLs may replace `null` in `LINKS`; no signatures or wallet connection required to view them.
