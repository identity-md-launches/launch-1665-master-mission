# Staking, launchpad and holder utility

This is an integration plan for the functional read-only interfaces delivered here. It is not a deployed financial system. No missing requester-owned address or chain identifier has been replaced with a test value.

## Staking findings and next integration

The pinned `BMCStaking` source uses the official BMC constant and one immutable treasury, checked for code and a threshold of at least two. That interface check alone does not prove a genuine or safe multisig; deployment review must authenticate its implementation, owners, threshold, modules and controls. The collection is configured once before activation, with a review hash that is a reference, not an on-chain audit proof.

Before activation, the treasury can configure duration (1–730 days), minimum BMC and linked BMC per NFT weight, bind the collection and fund rewards. Activation splits funded BMC into 55% token, 25% NFT, 15% bonus budgets; the remainder is reserve. Emission is linear over the program duration. The default 365-day program is **not a 365-day principal lock**: withdrawals have a same-block guard. Claims also require a later block than the last stake. The treasury can pause new deposits without pausing withdrawal/claim logic. Recovery paths are limited by reserve, unallocated emissions after expiry, or final remainder after all positions exit; each must be independently reviewed with rounding and solvency invariants.

For pool budget B, elapsed time t capped to duration D, cumulative emission is `floor(B × t / D)`. Newly emitted units increment the reward-per-weight index by `floor(emission × 2^128 / totalWeight)`. Account rewards use its weight, index delta, accrued balance and fractional remainder. The source's bonus weight is 20% of the smaller of principal and NFT-weight-linked cap, when the minimum is met. This is a reward-weight rule, **not 20% APY**.

There is no authenticated staking deployment/funding in the supplied records. Consequently the UI shows unavailable staked/reward values, disabled actions and source-derived explanations, not fabricated zeros or yields. The source suite passed 81 tests; Slither findings remain disclosed in `REVIEW.md`.

To integrate a genuine deployment: obtain the deployment receipt/address and review artifact, reproduce source/runtime, authenticate treasury and collection (including tier compatibility with the actual Pass), read activation/start/end/budgets/principal/reserves at one block, prove reserve coverage, and test deposits/withdrawals/claims on a mainnet fork. Then add exact-amount BMC approvals and per-action simulation/review/receipt tracking. Derive an explicitly variable APR only when nonzero funded emission, current total weight and remaining time support it. Do not annualize an expired or empty pool or advertise compounding that does not occur.

The imported NFT staking mode is custodial. It must not be used as VIP ownership proof. This delivery exposes no NFT transfer/approval for utility; a later custodial staking product would require a separate clearly explained opt-in, review and authorization.

## Launchpad preparation

The current form accepts name/ticker and optional image, description, website, X, Telegram and Discord. It validates HTTPS URLs and raster signatures/size, renders a safe local preview and downloads a versioned draft with `status: LOCAL_DRAFT_NOT_DEPLOYED` and unfunded holder claims. It does not upload, deploy or claim a token exists. Discovery, charts, creator balances, trades and burn history remain honest empty states until indexed chain data exists.

Before implementing financial contracts, establish IMD's authenticated chain ID, consensus/finality, public RPC/explorer, native gas asset and whether ETH is native or wrapped; identify canonical bridge contracts and risk model. Verify genuine IMD and authentic BMC representations, decimals, issuer/mint powers, redeemability, liquidity and a burn operation whose economic effect is real. Burning a wrapper without burning/redeeming the genuine asset is not an authentic token burn. The IMD website alone is insufficient chain evidence.

A separate reviewed factory/curve/router design should specify initial supply, curve equation, reserve invariants, buy/sell rounding, slippage limits, deadline, maximum mint and graduation/liquidity behavior. No platform creation fee is proposed; network gas and any optional user-provided liquidity/funding must be shown explicitly. The proposed **1% trading fee** is split **34% creator, 33% IMD conversion/burn, 33% BMC conversion/burn**. Integer dust must have a documented assignment so all fee units are conserved. The frontend draft helper models the split only; it moves no value.

Use independent conversion limits/deadlines and minimum burn outputs; handle unavailable routes without falsely labelling queued tokens burned. Creator fees should be separately claimable with reentrancy protection; never sweep reserves owed to traders. Emit events for each trade, fee allocation, conversion and genuine burn. Index these into price/candlestick data and creator dashboards from verified event ranges, with block timestamps, reorg handling and full raw-unit totals. Do not invent historical charts while no contracts exist.

Before launch: property/fuzz/invariant tests for curve conservation, reserve solvency, round-trip rounding, adverse order/reentrancy, malicious tokens, fee dust, failed conversion, price manipulation, MEV and upgrades/admin controls; independent review and authorization of exact runtime/address deployments. Integration remains disabled until those prerequisites are met.

## Non-custodial holder allocations

Creator reservations are optional and must be fully funded before being displayed as claimable. No campaign or funded airdrop was found, so the UI shows no invented entitlement. Connected holders can see live Ethereum Pass ownership, including multiple NFTs, without signing or transferring an NFT.

A future snapshot service should pin an Ethereum finalized block **number and hash**, official Pass address and chain ID, enumerate every token ID/owner at that block and publish the reproducible snapshot artifact. Use a reviewed bridge/light-client proof or explicitly governed attestation to commit a root on the destination chain; a browser RPC read is not a secure cross-chain proof. Specify whether entitlement belongs to the snapshot owner or current owner, and how later transfers are treated, before funding.

Use a domain-separated leaf binding campaign ID, source chain, source collection, snapshot block/hash, token ID, snapshot owner, destination chain, destination claim contract, distribution token and exact amount. The contract must prevent a second claim for the same campaign/token ID regardless of caller, support all eligible token IDs for a multiple-Pass holder, validate root/proof/funding/deadline, and update claimed state before value transfer. Do not let a replay on another campaign, chain or contract reuse an entitlement. Batch claims must enforce uniqueness and sum amounts without overflow.

If delegated claims require a signature, use explicit typed data binding recipient, token IDs, campaign, chain, verifying contract, nonce and expiry; support contract wallets via a reviewed EIP-1271 path. Ownership browsing never needs that signature. Claims should not require seed phrases, NFT approvals or NFT transfers. Show the snapshot, proof trust model, allocation amount, funding transaction, destination network, expiry and previous claim receipt before the user chooses to claim.

Test duplicate and replay attempts, stolen/changed recipients, duplicate batch IDs, invalid proofs, expired campaigns, transfers around the snapshot, contract wallets, chain reorgs and underfunding. Only verified funded campaigns populate eligible rewards, upcoming distributions and claim history.
