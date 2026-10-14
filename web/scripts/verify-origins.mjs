import { createPublicClient, http, parseAbiItem } from "viem";
import { writeFile, readFile } from "node:fs/promises";
const c = createPublicClient({
  transport: http(process.argv[2] || "https://ethereum-rpc.publicnode.com"),
});
const address = "0x92789d9bb680a2db8617270a530e9d0f80b48641";
const block = await c.getBlockNumber();
let first = 0n,
  last = block;
while (first < last) {
  const mid = (first + last) / 2n;
  const code = await c.getCode({ address, blockNumber: mid });
  if (code && code !== "0x") last = mid;
  else first = mid + 1n;
}
const logs = await c.getLogs({
  address,
  event: parseAbiItem(
    "event OwnershipTransferred(address indexed previousOwner,address indexed newOwner)",
  ),
  fromBlock: first,
  toBlock: first,
});
const tx = logs[0]
  ? await c.getTransaction({ hash: logs[0].transactionHash })
  : null;
const out = {
  chainId: 1,
  address,
  firstCodeBlock: String(first),
  ownershipEvents: logs.map((l) => ({
    previousOwner: l.args.previousOwner,
    newOwner: l.args.newOwner,
    hash: l.transactionHash,
  })),
  creationTransaction: tx
    ? {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        blockNumber: String(tx.blockNumber),
      }
    : null,
  note: "Ownership and transaction origin are recorded separately; the founder need not be the factory caller.",
};
await writeFile(
  "../docs/evidence/origin.json",
  JSON.stringify(out, null, 2) + "\n",
);
console.log(out);
