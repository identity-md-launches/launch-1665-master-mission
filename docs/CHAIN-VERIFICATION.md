# Chain and repository verification

These are implementing-worker observations, not an independent audit. Public source URLs and machine-readable evidence are included so a reviewer can reproduce them. Ethereum RPC source: https://ethereum-rpc.publicnode.com; the worker's provided relay was used during collection, as required by the assignment. No relay address, keyed endpoint, credential or private key is part of the export.

## Repositories

| Supplied repository | Retrieved main revision | Relationship established |
| --- | --- | --- |
| [Main site](https://github.com/identity-md-launches/launch-1481-bmc-illuminati) | `9963eea05a4682e423a8f0381ccab4e8b43a832a` | Website assets and the block-random NFT implementation used by the actual deployment |
| [Original NFT](https://github.com/0xSt3w/launch-1356-project-bmc-illuminati-pass) | `17aa38676fce6025a2d18cc705542e8a88c1157f` | Fork of the corresponding identity-md-launches repository; older Chainlink VRF design, not the deployed block-random ABI |
| [Staking](https://github.com/0xSt3w/launch-1357-project-bmc-illuminati) | `2eebb2a84e3913197de16d15c2b916378f932029` | Fork of the corresponding identity-md-launches repository; source-only, no authenticated deployment recorded |

Repository metadata is in `evidence/*-repository.json`. Merely having the same project name was not treated as proof of a contract relationship. No git submodule or imported Solidity dependency tree is shipped with this frontend.

## Official Pass and Genesis #1

- Collection: [`0x92789D9bb680a2Db8617270a530E9D0f80b48641`](https://etherscan.io/address/0x92789D9bb680a2Db8617270a530E9D0f80b48641).
- First deployed code at block **26186157**, transaction [`0xc3fbf78db4416092af78a0646e0e9d3a6e0f8bfe51698cbe4ceacdd23de3e936`](https://etherscan.io/tx/0xc3fbf78db4416092af78a0646e0e9d3a6e0f8bfe51698cbe4ceacdd23de3e936). It is a direct contract creation from the supplied founder wallet; the initial OwnershipTransferred event names the same owner. See `evidence/origin.json`.
- At snapshot block **26187055**, `ownerOf(1)` and `owner()` both returned `0x83027AD9d0D5374335086c539dADD1db983441B0`. The website refreshes NFT ownership independently; the founder is not assumed to remain the owner.
- `BMC()` is the supplied BMC token, `mintingOpen()` is true, `totalMinted()` is 1, `remainingSupply()` is 499, `pendingReveals()` is 0 and `totalBurned()` is exactly **1,000,000 × 10^18**.
- `tokenURI(1)` is base64 JSON with nine attributes, including **Legendary Genesis**, and the exact supplied IPFS image path.
- Mint receipt: [`0x808c8f4d701d140ea55dbd0aaf2bfc526baa937b4411cd14943f63e956cce0ea`](https://etherscan.io/tx/0x808c8f4d701d140ea55dbd0aaf2bfc526baa937b4411cd14943f63e956cce0ea). Both the NFT mint Transfer and the exact BMC zero-address burn occur in that receipt.

The old website configured `0xedd2be808e73bc443bc12aa07586193c193e8d51`, a different deployment. Its `ownerOf(1)` reverted during this run. The user's explicit official address and the fresh chain reads resolve which collection this website must display; no substitute collection is used.

## Bytecode and ABI

Compiled the main repository's pinned NFT source using Solidity 0.8.26, Cancun, optimizer 200. Substituted the actual BMC immutable at the compiler-reported offsets. Separating the length-delimited CBOR metadata, all **21,446 executable bytes** exactly match the requested deployed contract.

The requested runtime is 21,499 bytes with IPFS compiler metadata. The repository build is 21,458 bytes with `bytecode_hash = "none"`. Their first difference is at byte 21,446, inside the metadata trailer. This is why the previous full-runtime comparison falsely appeared to establish different implementations. This delivery still pins and checks the *complete actual runtime* at runtime; it does not strip arbitrary bytes from future deployments.

| Item | SHA-256 |
| --- | --- |
| Deployed NFT runtime | `b380ee53e2d9b7b5b4238f308f9b8b792dafdb620f8cbe47a50c1e871359a20a` |
| Compiled runtime with BMC immutable | `64503241c35f6ad4f325d43a73bd7af53f1063222dc15a7244b5b952f56c3673` |
| Matching executable portion | `c3cb984f8d613d3e3f851c170e07816ef8b370bab2b91262851f7cba2c3e7f86` |
| Canonical sorted full NFT ABI JSON | `f8ef521233c556d40a71a82c7c4fe843523cc6f6303a9093efcd139b929c7a4f` |

The complete generated ABI is `docs/abi/BMCIlluminatiPass.json`; frontend selectors use a typed subset from that source. `evidence/runtime-comparison.json` records the comparison. NFT Sourcify returned 404 and Etherscan source access could not be established. Compiler equivalence is not falsely represented as an Etherscan verification or independent review.

## Artwork and metadata

The dedicated supplied gateway returned HTTP 403. `ipfs.io` also returned 403, and the `dweb.link` subdomain returned 429. Pinata's public gateway returned the same CID/file successfully:

[Original Genesis PNG](https://gateway.pinata.cloud/ipfs/bafybeihfihwwpev4gkqjuqawgtptsv3ynzsokclo6odsolvoa65aqaac2u/genesis-01.png)

The original PNG SHA-256 is `b35a60c9a4fb8227ca6dd4874dca5e9d3ef7948ac0ccdb7b770851e0ae11c406`, matching the original repository's verification report. To keep the complete source and export below 8 MiB while retaining all prior artwork previews, the site stores a lossless WebP encoding of the original. FFmpeg decoded both images to RGBA; both decoded hashes were `3cef01fd502735ccf7bada1805176f59916cfa49ed0d0e3f3747d279000048f7`. **Every pixel is identical.** No artwork was generated or replaced. See `evidence/artwork.json`.

The 77 Genesis and 12 Standard preview files were copied byte-for-byte from the supplied main repository. They are labelled artwork previews, not minted token IDs, active listings or ownership records. Other newly minted Genesis images use the pinned immutable CID with gateway fallback; Standard SVG metadata is displayed in an image element, never inserted into the page as HTML.

A website cannot change the immutable deployed token URI or force MetaMask's metadata cache/gateway to refresh. The website's gallery/discovery is fixed; external-wallet thumbnail repair remains outside this deliverable.

## BMC and burns

BMC at [`0x38224239f2BDae357D47cb864BC533d7f72dF961`](https://etherscan.io/token/0x38224239f2BDae357D47cb864BC533d7f72dF961) has 18 decimals and a 1,000,000,000 initial supply. [Sourcify's matched source](https://sourcify.dev/server/v2/contract/1/0x38224239f2BDae357D47cb864BC533d7f72dF961?fields=all) is a plain ERC20 + ERC20Burnable with no owner, new mint, pause, blocklist, transfer tax or upgrade function. Runtime SHA-256: `b0ae261c881b8c6da58e46652b6b0ced43844d4cabb3174c6e710f3de2e45976`.

At block 26187055, supply was **984,742,728.905864527113784752 BMC** and total burned was **15,257,271.094135472886215248 BMC**. Scanning all BMC zero-address Transfer events from deployment block **26172209** through **26187055**, in bounded chunks, found **531** burns. Their raw-unit sum exactly equals `INITIAL_SUPPLY() - totalSupply()`. NFT burns are included in that amount; the dashboard never adds them twice. The frontend carries only the last 20 saved burns; `evidence/chain.json` retains the complete scan.

## Real trading pool

The BMC deployment receipt initializes a native-ETH/BMC Uniswap v4 pool:

- Pool ID: `0xc6c8d8b14ef3ab074e0c24bdb1ef88820525898cf71a5b8f350c510900c6c73a`.
- PoolManager: `0x000000000004444c5dc75cB358380D2e3dE08A90`.
- Hook: `0xfDA08a7527bA80f2a32196320ef607499c5960cC`, Sourcify-matched `BMCHook`.
- Pool fee: **1.25%**; hook readouts: **1% ETH buy fee** and **1% BMC sell burn**. The fee recipient is the supplied founder. These are immutable source parameters, not the future launchpad proposal.
- StateView and Quoter addresses were verified against [Uniswap's deployment documentation](https://developers.uniswap.org/docs/protocols/v4/deployments). Their bytecode and the hook bytecode are pinned for reads/quotes.
- Active liquidity was nonzero at the evidence block. It is displayed as raw liquidity units, never called USD liquidity.

Both exact-input buy (0.001 ETH) and sell (1,000 BMC) simulations succeeded on the deployed Quoter; results and block numbers are in `evidence/quotes.json`. They are observations, not current guaranteed quotes. The frontend obtains a fresh quote, includes the fee effect and computes minimum received with integer arithmetic. There is no in-site swap broadcast until a separate router integration has been reviewed. The external Uniswap link makes no promise that its frontend supports this hook at a later date.

## Reproduction

From `web/`, the read-only scripts `verify-chain.mjs`, `verify-origins.mjs`, `verify-pool.mjs`, and `check-quote.mjs` accept a public RPC URL as their only optional argument. Source-retrieval/compiler checks additionally need the exact GitHub revision shown above and Foundry. `docs/LiveDeployedPass.t.sol` is the actual three-test fork harness; place it in the pinned NFT checkout's `test/` and run against block 26187055. Do not deploy or broadcast to reproduce it.

Run `verify-chain.mjs` first; it creates the temporary deployment receipt consumed by `inspect-pool.mjs`. Run `inspect-pool.mjs`, then `verify-pool.mjs`, then `check-quote.mjs` to complete the pool snapshot including bytecode pins and fee reads. These are explicit evidence-refresh operations that update checked-in snapshots; run the entire sequence, review changes and rebuild before serving a changed export. Do not treat a fresh observation as review acceptance.
