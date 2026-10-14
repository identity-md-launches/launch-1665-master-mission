import { createPublicClient, http, parseAbi, getAddress } from "viem";
import { readFile, writeFile } from "node:fs/promises";
const c = createPublicClient({
  transport: http(process.argv[2] || "https://ethereum-rpc.publicnode.com"),
});
const p = JSON.parse(
  await readFile("../test/scratch/research/pools.json", "utf8"),
)[0];
const state = "0x7ffe42c4a5deea5b0fec41c94c136cf115597227";
const b = await c.getBlock();
const [liquidity, slot, code] = await Promise.all([
  c.readContract({
    address: state,
    abi: parseAbi([
      "function getLiquidity(bytes32 poolId) view returns (uint128 liquidity)",
    ]),
    functionName: "getLiquidity",
    args: [p.args.id],
    blockNumber: b.number,
  }),
  c.readContract({
    address: state,
    abi: parseAbi([
      "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96,int24 tick,uint24 protocolFee,uint24 lpFee)",
    ]),
    functionName: "getSlot0",
    args: [p.args.id],
    blockNumber: b.number,
  }),
  c.getCode({ address: p.args.hooks, blockNumber: b.number }),
]);
let hookSource = { status: "unavailable" };
try {
  const url = `https://sourcify.dev/server/v2/contract/1/${p.args.hooks}?fields=all`;
  const r = await fetch(url);
  if (r.ok) {
    const j = await r.json();
    await writeFile(
      "../test/scratch/research/hook-sourcify.json",
      JSON.stringify(j),
    );
    hookSource = {
      status: "retrieved",
      runtimeMatch: j.runtimeMatch,
      contract: j.compilation?.name,
      url,
    };
  }
} catch {}
const out = {
  publicRpc: "https://ethereum-rpc.publicnode.com",
  block: String(b.number),
  timestamp: Number(b.timestamp),
  poolId: p.args.id,
  poolManager: p.address,
  stateView: state,
  currency0: p.args.currency0,
  currency1: p.args.currency1,
  fee: p.args.fee,
  tickSpacing: p.args.tickSpacing,
  hook: p.args.hooks,
  liquidity: String(liquidity),
  sqrtPriceX96: String(slot[0]),
  tick: slot[1],
  protocolFee: slot[2],
  lpFee: slot[3],
  initializationTransaction: p.transactionHash,
  initializationBlock: p.blockNumber,
  hookBytes: ((code || "").length - 2) / 2,
  hookSource,
  executionEnabled: false,
};
await writeFile(
  "../docs/evidence/pool.json",
  JSON.stringify(out, null, 2) + "\n",
);
await writeFile("src/pool-snapshot.json", JSON.stringify(out, null, 2) + "\n");
console.log(out);
