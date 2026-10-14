import { useQuery } from "@tanstack/react-query";
import { useConnection } from "wagmi";
import {
  getAddress,
  keccak256,
  formatUnits,
  parseAbiItem,
  type Address,
  type Hash,
} from "viem";
import {
  publicClient,
  PASS,
  BMC,
  bmcAbi,
  passAbi,
  RELEASE,
  CID,
  GENESIS_PRICE,
  MYSTERY_PRICE,
  sourceSnapshot as saved,
} from "./config";
import { decodeMetadata, type Metadata } from "./metadata";
export type CollectionData = {
  block: bigint;
  timestamp: number;
  fetchedAt: number;
  mode: "live" | "snapshot";
  minted: number;
  remaining: number;
  burned: bigint;
  price: bigint;
  pending: number;
  nextReveal: number;
  mintingOpen: boolean;
  tokenSupply: bigint;
  initialSupply: bigint;
  tokenBurned: bigint;
  owner: Address;
  runtimeVerified: boolean;
};
export const historical: CollectionData = {
  block: BigInt(saved.blockNumber),
  timestamp: Number(saved.blockTimestamp),
  fetchedAt: Date.parse(saved.verifiedAt),
  mode: "snapshot",
  minted: Number(saved.pass.totalMinted),
  remaining: Number(saved.pass.remainingSupply),
  burned: BigInt(saved.pass.totalBurned),
  price: BigInt(saved.pass.currentPrice),
  pending: Number(saved.pass.pendingReveals),
  nextReveal: Number(saved.pass.nextRevealId),
  mintingOpen: saved.pass.mintingOpen,
  tokenSupply: BigInt(saved.token.supply),
  initialSupply: BigInt(saved.token.initialSupply),
  tokenBurned: BigInt(saved.token.burned),
  owner: getAddress(saved.pass.owner),
  runtimeVerified: true,
};
export function amount(
  n: bigint | undefined,
  decimals = 18,
  digits = 4,
): string {
  if (n === undefined) return "Unavailable";
  const raw = formatUnits(n, decimals);
  const [whole, tail = ""] = raw.split(".");
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = tail.slice(0, digits).replace(/0+$/, "");
  return formatted + (fraction ? "." + fraction : "");
}
export function errorText(e: unknown): string {
  const v = e as {
    shortMessage?: string;
    message?: string;
    code?: number;
    cause?: { code?: number };
  };
  if (v?.code === 4001 || v?.cause?.code === 4001)
    return "You rejected the wallet request. You can try again.";
  return (
    v?.shortMessage ||
    v?.message ||
    "The request failed. Check your connection and retry."
  ).slice(0, 260);
}
export async function verifyRuntime(blockNumber?: bigint) {
  const [chain, pass, bmc] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getCode({ address: PASS, blockNumber }),
    publicClient.getCode({ address: BMC, blockNumber }),
  ]);
  if (
    chain !== 1 ||
    !pass ||
    !bmc ||
    keccak256(pass) !== RELEASE.passRuntimeKeccak ||
    keccak256(bmc) !== RELEASE.bmcRuntimeKeccak
  )
    throw new Error(
      "Ethereum contract verification failed. Financial actions are disabled.",
    );
}
export async function readCollection(): Promise<CollectionData> {
  const block = await publicClient.getBlock();
  await verifyRuntime(block.number);
  const functions = [
    "totalMinted",
    "remainingSupply",
    "totalBurned",
    "currentPrice",
    "pendingReveals",
    "nextRevealId",
    "mintingOpen",
    "owner",
    "BMC",
    "MAX_SUPPLY",
    "GENESIS_PRICE",
    "MYSTERY_PRICE",
    "genesisImagesCID",
  ] as const;
  const r = await publicClient.multicall({
    contracts: functions.map((functionName) => ({
      address: PASS,
      abi: passAbi,
      functionName,
    })),
    blockNumber: block.number,
    allowFailure: false,
  });
  const [tokenSupply, initialSupply, decimals] = await publicClient.multicall({
    contracts: [
      { address: BMC, abi: bmcAbi, functionName: "totalSupply" },
      { address: BMC, abi: bmcAbi, functionName: "INITIAL_SUPPLY" },
      { address: BMC, abi: bmcAbi, functionName: "decimals" },
    ],
    blockNumber: block.number,
    allowFailure: false,
  });
  if (
    getAddress(r[8] as Address) !== BMC ||
    r[9] !== 500n ||
    r[10] !== GENESIS_PRICE ||
    r[11] !== MYSTERY_PRICE ||
    r[12] !== CID ||
    decimals !== 18
  )
    throw new Error(
      "Collection parameters differ from the documented mint rules.",
    );
  if (tokenSupply > initialSupply || Number(r[0]) > 500)
    throw new Error("Unexpected supply reported by the contract.");
  return {
    block: block.number,
    timestamp: Number(block.timestamp),
    fetchedAt: Date.now(),
    mode: "live",
    minted: Number(r[0]),
    remaining: Number(r[1]),
    burned: r[2] as bigint,
    price: r[3] as bigint,
    pending: Number(r[4]),
    nextReveal: Number(r[5]),
    mintingOpen: r[6] as boolean,
    owner: getAddress(r[7] as Address),
    tokenSupply,
    initialSupply,
    tokenBurned: initialSupply - tokenSupply,
    runtimeVerified: true,
  };
}
export function useCollection() {
  return useQuery({
    queryKey: ["collection", PASS],
    queryFn: readCollection,
    initialData: historical,
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
export type NFT = {
  id: number;
  owner: Address;
  metadata: Metadata;
  status: number;
  revealBlock: bigint;
  deadline: bigint;
  block: bigint;
  timestamp: number;
  mode: "live" | "snapshot";
};
export const genesisSnapshot: NFT = {
  id: 1,
  owner: getAddress(saved.genesis.owner),
  metadata: decodeMetadata(saved.genesis.tokenURI),
  status: 0,
  revealBlock: 0n,
  deadline: 0n,
  block: historical.block,
  timestamp: historical.timestamp,
  mode: "snapshot",
};
export async function readNFT(id: number): Promise<NFT> {
  if (!Number.isInteger(id) || id < 1 || id > 500)
    throw new Error("Enter a token ID from 1 to 500.");
  const b = await publicClient.getBlock();
  await verifyRuntime(b.number);
  const r = await publicClient.multicall({
    contracts: [
      {
        address: PASS,
        abi: passAbi,
        functionName: "ownerOf",
        args: [BigInt(id)],
      },
      {
        address: PASS,
        abi: passAbi,
        functionName: "tokenURI",
        args: [BigInt(id)],
      },
      {
        address: PASS,
        abi: passAbi,
        functionName: "revealStatusOf",
        args: [BigInt(id)],
      },
      {
        address: PASS,
        abi: passAbi,
        functionName: "revealBlockOf",
        args: [BigInt(id)],
      },
      {
        address: PASS,
        abi: passAbi,
        functionName: "revealDeadlineOf",
        args: [BigInt(id)],
      },
    ],
    blockNumber: b.number,
    allowFailure: false,
  });
  return {
    id,
    owner: getAddress(r[0]),
    metadata: decodeMetadata(r[1]),
    status: r[2],
    revealBlock: r[3],
    deadline: r[4],
    block: b.number,
    timestamp: Number(b.timestamp),
    mode: "live",
  };
}
export function useNFT(id: number) {
  return useQuery({
    queryKey: ["nft", PASS, id],
    queryFn: () => readNFT(id),
    initialData: id === 1 ? genesisSnapshot : undefined,
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
    retry: 1,
  });
}
export async function discoverOwned(
  minted: number,
  account: Address,
  expected: bigint,
  readOwners: (ids: number[]) => Promise<readonly Address[]>,
): Promise<number[]> {
  if (!Number.isInteger(minted) || minted < 0 || minted > 500)
    throw new Error("Unexpected NFT supply.");
  const ids: number[] = [];
  for (let start = 1; start <= minted; start += 50) {
    const page = Array.from(
      { length: Math.min(50, minted - start + 1) },
      (_, i) => start + i,
    );
    const owners = await readOwners(page);
    if (owners.length !== page.length)
      throw new Error(
        "NFT ownership scan is incomplete. Refresh to try again.",
      );
    owners.forEach((owner, i) => {
      if (owner.toLowerCase() === account.toLowerCase()) ids.push(page[i]);
    });
  }
  if (BigInt(ids.length) !== expected)
    throw new Error("NFT ownership scan is incomplete. Refresh to try again.");
  return ids;
}
export async function readWallet(address: Address) {
  const b = await publicClient.getBlock();
  await verifyRuntime(b.number);
  const [eth, r] = await Promise.all([
    publicClient.getBalance({ address, blockNumber: b.number }),
    publicClient.multicall({
      contracts: [
        {
          address: BMC,
          abi: bmcAbi,
          functionName: "balanceOf",
          args: [address],
        },
        {
          address: BMC,
          abi: bmcAbi,
          functionName: "allowance",
          args: [address, PASS],
        },
        {
          address: PASS,
          abi: passAbi,
          functionName: "balanceOf",
          args: [address],
        },
        { address: PASS, abi: passAbi, functionName: "totalMinted" },
      ],
      blockNumber: b.number,
      allowFailure: false,
    }),
  ]);
  const ids = await discoverOwned(Number(r[3]), address, r[2], (ids) =>
    publicClient.multicall({
      contracts: ids.map((id) => ({
        address: PASS,
        abi: passAbi,
        functionName: "ownerOf" as const,
        args: [BigInt(id)] as const,
      })),
      blockNumber: b.number,
      allowFailure: false,
    }),
  );
  return {
    address,
    eth,
    bmc: r[0],
    allowance: r[1],
    ids,
    block: b.number,
    timestamp: Number(b.timestamp),
  };
}
export function useWalletData() {
  const { address } = useConnection();
  return useQuery({
    queryKey: ["wallet", address, PASS],
    queryFn: () => readWallet(address!),
    enabled: !!address,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}
export const transferEvent = parseAbiItem(
  "event Transfer(address indexed from,address indexed to,uint256 value)",
);
export type Activity = {
  hash: Hash;
  block: bigint;
  logIndex: number;
  amount: bigint;
  from: Address;
  to: Address;
  kind: "BMC transfer" | "BMC burn" | "Pass transfer";
  tokenId?: number;
};
export async function readActivity(account?: Address) {
  const b = await publicClient.getBlock();
  await verifyRuntime(b.number);
  const from = b.number - 4999n;
  const logs: Activity[] = [];
  for (let start = from; start <= b.number; start += 1000n) {
    const to = start + 999n > b.number ? b.number : start + 999n;
    if (account) {
      const [incoming, outgoing, nftIn, nftOut] = await Promise.all([
        publicClient.getLogs({
          address: BMC,
          event: transferEvent,
          args: { to: account },
          fromBlock: start,
          toBlock: to,
        }),
        publicClient.getLogs({
          address: BMC,
          event: transferEvent,
          args: { from: account },
          fromBlock: start,
          toBlock: to,
        }),
        publicClient.getContractEvents({
          address: PASS,
          abi: passAbi,
          eventName: "Transfer",
          args: { to: account },
          fromBlock: start,
          toBlock: to,
        }),
        publicClient.getContractEvents({
          address: PASS,
          abi: passAbi,
          eventName: "Transfer",
          args: { from: account },
          fromBlock: start,
          toBlock: to,
        }),
      ]);
      for (const l of [...incoming, ...outgoing])
        if (l.args.value !== undefined && l.args.from && l.args.to)
          logs.push({
            hash: l.transactionHash,
            block: l.blockNumber,
            logIndex: l.logIndex,
            amount: l.args.value,
            from: l.args.from,
            to: l.args.to,
            kind:
              l.args.to === "0x0000000000000000000000000000000000000000"
                ? "BMC burn"
                : "BMC transfer",
          });
      for (const l of [...nftIn, ...nftOut])
        if (l.args.tokenId !== undefined && l.args.from && l.args.to)
          logs.push({
            hash: l.transactionHash,
            block: l.blockNumber,
            logIndex: l.logIndex,
            amount: 0n,
            from: l.args.from,
            to: l.args.to,
            kind: "Pass transfer",
            tokenId: Number(l.args.tokenId),
          });
    } else {
      const burns = await publicClient.getLogs({
        address: BMC,
        event: transferEvent,
        args: { to: "0x0000000000000000000000000000000000000000" },
        fromBlock: start,
        toBlock: to,
      });
      for (const l of burns)
        if (l.args.value !== undefined && l.args.from)
          logs.push({
            hash: l.transactionHash,
            block: l.blockNumber,
            logIndex: l.logIndex,
            amount: l.args.value,
            from: l.args.from,
            to: "0x0000000000000000000000000000000000000000",
            kind: "BMC burn",
          });
    }
  }
  const unique = [
    ...new Map(logs.map((l) => [`${l.hash}:${l.logIndex}`, l])).values(),
  ].sort((a, b) =>
    a.block > b.block ? -1 : a.block < b.block ? 1 : b.logIndex - a.logIndex,
  );
  return { items: unique, from, to: b.number, timestamp: Number(b.timestamp) };
}
export function useActivity(account?: Address) {
  return useQuery({
    queryKey: ["activity", account || "burns"],
    queryFn: () => readActivity(account),
    staleTime: 60_000,
    retry: 0,
  });
}
