/** Read-only evidence collector. No wallet, keys or signing. Endpoint may be passed explicitly. */
import {
  createPublicClient,
  http,
  parseAbi,
  decodeFunctionResult,
  parseEventLogs,
  erc20Abi,
  keccak256,
} from "viem";
import { mainnet } from "viem/chains";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const endpoint = process.argv[2] || "https://ethereum-rpc.publicnode.com";
const client = createPublicClient({
  chain: mainnet,
  transport: http(endpoint, { timeout: 30000, retryCount: 2 }),
});
const PASS = "0x92789d9bb680a2db8617270a530e9d0f80b48641",
  BMC = "0x38224239f2bdae357d47cb864bc533d7f72df961";
const abi = JSON.parse(
  await readFile("../docs/abi/BMCIlluminatiPass.json", "utf8"),
);
const block = await client.getBlock();
const read = (address, abi, functionName, args = []) =>
  client.readContract({
    address,
    abi,
    functionName,
    args,
    blockNumber: block.number,
  });
const names = [
  "name",
  "symbol",
  "owner",
  "BMC",
  "mintingOpen",
  "totalMinted",
  "remainingSupply",
  "totalBurned",
  "currentPrice",
  "pendingReveals",
  "MAX_SUPPLY",
  "GENESIS_PRICE",
  "MYSTERY_PRICE",
  "genesisImagesCID",
  "nextRevealId",
];
const values = await Promise.all(names.map((name) => read(PASS, abi, name)));
const pass = Object.fromEntries(names.map((n, i) => [n, values[i]]));
const codes = await Promise.all(
  [PASS, BMC].map((address) =>
    client.getCode({ address, blockNumber: block.number }),
  ),
);
const hash = (c) =>
  createHash("sha256")
    .update(Buffer.from(c.slice(2), "hex"))
    .digest("hex");
const owner = await read(PASS, abi, "ownerOf", [1n]);
const tokenURI = await read(PASS, abi, "tokenURI", [1n]);
const metadata = JSON.parse(
  Buffer.from(tokenURI.split(",")[1], "base64").toString("utf8"),
);
const [supply, symbol, decimals, name, initialSupply] = await Promise.all(
  ["totalSupply", "symbol", "decimals", "name", "INITIAL_SUPPLY"].map((n) =>
    read(
      BMC,
      n === "INITIAL_SUPPLY"
        ? parseAbi(["function INITIAL_SUPPLY() view returns (uint256)"])
        : erc20Abi,
      n,
    ),
  ),
);
const token = {
  name,
  symbol,
  decimals,
  supply,
  initialSupply,
  burned: initialSupply - supply,
};
const transfer = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
])[0];
const nftTransfer = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
])[0];
const burnLogs = [];
const nftLogs = [];
for (let from = 26172209n; from <= block.number; from += 2000n) {
  const to = from + 1999n > block.number ? block.number : from + 1999n;
  const [burns, nfts] = await Promise.all([
    client.getLogs({
      address: BMC,
      event: transfer,
      args: { to: "0x0000000000000000000000000000000000000000" },
      fromBlock: from,
      toBlock: to,
    }),
    client.getLogs({
      address: PASS,
      event: nftTransfer,
      fromBlock: from,
      toBlock: to,
    }),
  ]);
  burnLogs.push(...burns);
  nftLogs.push(...nfts);
}
const nftMint = nftLogs.find(
  (l) =>
    l.args.tokenId === 1n &&
    l.args.from === "0x0000000000000000000000000000000000000000",
);
const receipt = nftMint
  ? await client.getTransactionReceipt({ hash: nftMint.transactionHash })
  : null;
const matchedBurn = receipt
  ? parseEventLogs({ abi: erc20Abi, logs: receipt.logs }).filter(
      (l) =>
        l.address.toLowerCase() === BMC &&
        l.eventName === "Transfer" &&
        l.args.to.toLowerCase() ===
          "0x0000000000000000000000000000000000000000",
    )
  : [];
const bmcDeployReceipt = await client.getTransactionReceipt({
  hash: "0xa736071ac85b645dddb9f6cdf0dfecc208e31df213cba6d3156839e2ae2c0eca",
});
await mkdir("../docs/evidence", { recursive: true });
await mkdir("../test/scratch/research", { recursive: true });
const result = {
  chainId: 1,
  publicRpc: "https://ethereum-rpc.publicnode.com",
  verifiedAt: new Date().toISOString(),
  blockNumber: block.number,
  blockHash: block.hash,
  blockTimestamp: block.timestamp,
  passAddress: PASS,
  bmcAddress: BMC,
  pass,
  token,
  runtime: {
    pass: {
      bytes: (codes[0].length - 2) / 2,
      sha256: hash(codes[0]),
      keccak: keccak256(codes[0]),
    },
    bmc: {
      bytes: (codes[1].length - 2) / 2,
      sha256: hash(codes[1]),
      keccak: keccak256(codes[1]),
    },
  },
  genesis: {
    id: 1,
    owner,
    tokenURI,
    metadata,
    mintTransaction: nftMint?.transactionHash,
    mintBlock: nftMint?.blockNumber,
    burnInMintReceipt: matchedBurn.map((l) => ({
      from: l.args.from,
      value: l.args.value,
    })),
  },
  burns: burnLogs.map((l) => ({
    from: l.args.from,
    amount: l.args.value,
    hash: l.transactionHash,
    blockNumber: l.blockNumber,
    logIndex: l.logIndex,
  })),
  nftTransfers: nftLogs.map((l) => ({
    from: l.args.from,
    to: l.args.to,
    id: l.args.tokenId,
    hash: l.transactionHash,
    blockNumber: l.blockNumber,
    logIndex: l.logIndex,
  })),
  burnScan: {
    from: 26172209n,
    to: block.number,
    complete: true,
    logTotal: burnLogs.reduce((s, l) => s + l.args.value, 0n),
  },
};
const json =
  JSON.stringify(
    result,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ) + "\n";
await writeFile("../docs/evidence/chain.json", json);
await writeFile(
  "src/snapshot.json",
  JSON.stringify(
    { ...result, burns: result.burns.slice(-20), savedBurnEvents: 20 },
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ) + "\n",
);
await writeFile(
  "../test/scratch/research/bmc-deploy-receipt.json",
  JSON.stringify(
    bmcDeployReceipt,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      blockNumber: String(block.number),
      pass,
      token,
      owner,
      mintTransaction: nftMint?.transactionHash,
      burnEvents: burnLogs.length,
      burnSumMatches: result.burnScan.logTotal === token.burned,
    },
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ),
);
