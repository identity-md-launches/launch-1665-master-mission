import {
  createPublicClient,
  http,
  parseAbi,
  getAddress,
  parseEther,
  keccak256,
} from "viem";
import { readFile, writeFile } from "node:fs/promises";
const c = createPublicClient({
  transport: http(process.argv[2] || "https://ethereum-rpc.publicnode.com"),
});
const p = JSON.parse(await readFile("src/pool-snapshot.json", "utf8"));
const abi = parseAbi([
  "function quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) returns (uint256 amountOut,uint256 gasEstimate)",
]);
const block = await c.getBlock();
const results = [];
for (const [buy, value] of [
  [true, parseEther("0.001")],
  [false, parseEther("1000")],
]) {
  try {
    const r = await c.simulateContract({
      address: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203",
      abi,
      functionName: "quoteExactInputSingle",
      args: [
        {
          poolKey: {
            currency0: p.currency0,
            currency1: p.currency1,
            fee: p.fee,
            tickSpacing: p.tickSpacing,
            hooks: p.hook,
          },
          zeroForOne: buy,
          exactAmount: value,
          hookData: "0x",
        },
      ],
      blockNumber: block.number,
    });
    results.push({
      buy,
      input: String(value),
      output: String(r.result[0]),
      gasEstimate: String(r.result[1]),
      ok: true,
    });
  } catch (e) {
    results.push({
      buy,
      input: String(value),
      ok: false,
      error: e.shortMessage || e.message,
    });
  }
}
const hAbi = parseAbi([
  "function buyFeeBps() view returns(uint256)",
  "function sellBurnBps() view returns(uint256)",
  "function feeRecipient() view returns(address)",
]);
for (const n of ["buyFeeBps", "sellBurnBps", "feeRecipient"])
  p[n] = String(
    await c.readContract({
      address: p.hook,
      abi: hAbi,
      functionName: n,
      blockNumber: block.number,
    }),
  );
p.hookRuntimeKeccak = keccak256(
  await c.getCode({ address: p.hook, blockNumber: block.number }),
);
p.quoterRuntimeKeccak = keccak256(
  await c.getCode({
    address: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203",
    blockNumber: block.number,
  }),
);
p.stateRuntimeKeccak = keccak256(
  await c.getCode({ address: p.stateView, blockNumber: block.number }),
);
await writeFile("src/pool-snapshot.json", JSON.stringify(p, null, 2) + "\n");
await writeFile(
  "../docs/evidence/pool.json",
  JSON.stringify(p, null, 2) + "\n",
);
const out = {
  block: String(block.number),
  timestamp: Number(block.timestamp),
  quoter: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203",
  results,
  fees: {
    buyFeeBps: p.buyFeeBps,
    sellBurnBps: p.sellBurnBps,
    feeRecipient: p.feeRecipient,
  },
};
await writeFile(
  "../docs/evidence/quotes.json",
  JSON.stringify(out, null, 2) + "\n",
);
console.log(out);
