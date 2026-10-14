import { readFile, writeFile } from "node:fs/promises";
import {
  parseAbi,
  parseEventLogs,
  createPublicClient,
  http,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
const r = JSON.parse(
  await readFile("../test/scratch/research/bmc-deploy-receipt.json", "utf8"),
);
const abi = parseAbi([
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
]);
const logs = parseEventLogs({ abi, logs: r.logs });
console.log(
  JSON.stringify(logs, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2),
);
await writeFile(
  "../test/scratch/research/pools.json",
  JSON.stringify(logs, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2),
);
