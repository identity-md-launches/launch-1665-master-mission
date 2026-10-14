import {
  encodeFunctionData,
  getAddress,
  parseEventLogs,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import { BMC, PASS, RELEASE, releaseBlockers, passAbi, bmcAbi } from "./config";
import { readCollection, verifyRuntime } from "./data";
import { publicClient } from "./config";
export type Action = "approve" | "revoke" | "genesis" | "mystery" | "reveal";
export type Prepared = {
  action: Action;
  account: Address;
  to: Address;
  data: Hash;
  amount: bigint;
  gas: bigint;
  maxFeePerGas: bigint;
  preparedAt: number;
  block: bigint;
  label: string;
};
export type Pending = {
  account: Address;
  pass: Address;
  chainId: 1;
  action: Action;
  hash?: Hash;
  status:
    "wallet" | "pending" | "confirmed" | "reverted" | "uncertain" | "cancelled";
  createdAt: number;
  label: string;
  amount: string;
  mintedIds?: number[];
  to?: Address;
  data?: Hash;
};
const KEY = "bmc:transactions:v2:1:" + PASS;
export function assertReleased(release = RELEASE) {
  const reasons = releaseBlockers(release);
  if (reasons.length)
    throw new Error("Transactions are locked: " + reasons.join(" "));
}
export function loadTransactions(): Pending[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw)
      ? raw
          .filter(
            (r: Pending) =>
              r?.chainId === 1 &&
              r.pass === PASS &&
              /^0x[0-9a-f]{40}$/i.test(r.account) &&
              (!r.hash || /^0x[0-9a-f]{64}$/i.test(r.hash)) &&
              ["approve", "revoke", "genesis", "mystery", "reveal"].includes(
                r.action,
              ) &&
              [
                "wallet",
                "pending",
                "confirmed",
                "reverted",
                "uncertain",
                "cancelled",
              ].includes(r.status),
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
function persist(rows: Pending[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 50)));
  window.dispatchEvent(new Event("bmc-transactions"));
}
function update(row: Pending) {
  const rows = loadTransactions();
  const i = rows.findIndex(
    (r) => r.account === row.account && r.createdAt === row.createdAt,
  );
  if (i < 0) rows.unshift(row);
  else rows[i] = row;
  persist(rows);
}
export function unresolved(account: Address) {
  return loadTransactions().some(
    (r) =>
      r.account.toLowerCase() === account.toLowerCase() &&
      ["wallet", "pending", "uncertain"].includes(r.status),
  );
}
export function clearUncertain(row: Pending) {
  if (!["wallet", "uncertain"].includes(row.status) || row.hash)
    throw new Error("Use receipt recovery for a known transaction.");
  update({ ...row, status: "cancelled" });
}
export async function validateSession(wallet: WalletClient, account: Address) {
  const [chain, accounts] = await Promise.all([
    wallet.getChainId(),
    wallet.getAddresses(),
  ]);
  if (chain !== 1) throw new Error("Switch your wallet to Ethereum Mainnet.");
  if (!accounts[0] || getAddress(accounts[0]) !== getAddress(account))
    throw new Error("Your wallet account changed. Review the action again.");
}
export async function prepareAction(
  action: Action,
  account: Address,
  wallet: WalletClient,
): Promise<Prepared> {
  assertReleased();
  await validateSession(wallet, account);
  if (unresolved(account))
    throw new Error(
      "Resolve the pending wallet request or transaction before starting another.",
    );
  const c = await readCollection();
  const [balance, allowance, eth] = await Promise.all([
    publicClient.readContract({
      address: BMC,
      abi: bmcAbi,
      functionName: "balanceOf",
      args: [account],
      blockNumber: c.block,
    }),
    publicClient.readContract({
      address: BMC,
      abi: bmcAbi,
      functionName: "allowance",
      args: [account, PASS],
      blockNumber: c.block,
    }),
    publicClient.getBalance({ address: account, blockNumber: c.block }),
  ]);
  let to: Address = PASS,
    data: Hash,
    amount = 0n,
    label = "";
  if (action === "approve" || action === "revoke") {
    if (action === "approve" && (!c.mintingOpen || !c.remaining))
      throw new Error("Minting is closed or sold out.");
    if (action === "approve" && allowance !== 0n && allowance !== c.price)
      throw new Error(
        "Revoke the existing allowance before approving the exact mint price.",
      );
    if (action === "approve" && allowance === c.price)
      throw new Error("The exact mint allowance is already approved.");
    amount = action === "revoke" ? 0n : c.price;
    to = BMC;
    data = encodeFunctionData({
      abi: bmcAbi,
      functionName: "approve",
      args: [PASS, amount],
    });
    label =
      action === "revoke" ? "Revoke BMC allowance" : "Approve one mint price";
  } else if (action === "genesis" || action === "mystery") {
    if (!c.mintingOpen || !c.remaining)
      throw new Error("Minting is closed or sold out.");
    if ((action === "genesis") !== c.minted < 40)
      throw new Error(
        "The mint phase changed. Refresh and review the current phase.",
      );
    if (balance < c.price)
      throw new Error("Your BMC balance is below the mint price.");
    if (allowance !== c.price)
      throw new Error("Approve the exact mint price before minting.");
    amount = c.price;
    data = encodeFunctionData({
      abi: passAbi,
      functionName: action === "genesis" ? "mintGenesis" : "mintMystery",
    });
    label = action === "genesis" ? "Mint Genesis Pass" : "Mint Mystery Pass";
  } else {
    if (c.pending === 0)
      throw new Error("There are no pending NFTs to reveal.");
    const revealBlock = await publicClient.readContract({
      address: PASS,
      abi: passAbi,
      functionName: "revealBlockOf",
      args: [BigInt(c.nextReveal)],
      blockNumber: c.block,
    });
    if (c.block <= revealBlock)
      throw new Error(
        "The next reveal block has not passed. Refresh after another Ethereum block.",
      );
    data = encodeFunctionData({
      abi: passAbi,
      functionName: "reveal",
      args: [BigInt(Math.min(50, c.pending))],
    });
    label = "Reveal up to 50 pending Passes";
  }
  // eth_call cannot broadcast. Both simulation and gas estimation must succeed.
  await publicClient.call({
    account,
    to,
    data,
    value: 0n,
    blockNumber: c.block,
  });
  const [estimate, fees] = await Promise.all([
    publicClient.estimateGas({ account, to, data, value: 0n }),
    publicClient.estimateFeesPerGas(),
  ]);
  const gas = (estimate * 120n) / 100n + 50_000n;
  const maxFeePerGas = fees.maxFeePerGas;
  if (eth < gas * maxFeePerGas)
    throw new Error(
      "Your ETH balance is below the estimated maximum network fee.",
    );
  return {
    action,
    account,
    to,
    data,
    amount,
    gas,
    maxFeePerGas,
    preparedAt: Date.now(),
    block: c.block,
    label,
  };
}
export async function submitAction(
  p: Prepared,
  wallet: WalletClient,
): Promise<Pending> {
  assertReleased();
  if (!navigator.locks)
    throw new Error(
      "This browser cannot safely lock transaction submission across tabs. Use a current secure browser.",
    );
  return navigator.locks.request(
    "bmc-write:" + p.account.toLowerCase(),
    { ifAvailable: true },
    async (lock) => {
      if (!lock)
        throw new Error(
          "A transaction is already being submitted in another tab.",
        );
      if (Date.now() - p.preparedAt > 60_000)
        throw new Error(
          "This review expired. Simulate and review the transaction again.",
        );
      await validateSession(wallet, p.account);
      if (unresolved(p.account))
        throw new Error("A transaction is already pending.");
      // Re-run release/runtime/phase/price/balance/simulation checks after the user reviewed the transaction.
      const fresh = await prepareAction(p.action, p.account, wallet);
      if (
        fresh.to !== p.to ||
        fresh.data !== p.data ||
        fresh.amount !== p.amount
      )
        throw new Error("Transaction details changed. Review again.");
      await validateSession(wallet, p.account);
      let row: Pending = {
        account: p.account,
        pass: PASS,
        chainId: 1,
        action: p.action,
        status: "wallet",
        createdAt: Date.now(),
        label: p.label,
        amount: p.amount.toString(),
        to: p.to,
        data: p.data,
      };
      // Storage failure stops submission. The lock is persisted before opening a wallet prompt.
      update(row);
      try {
        const hash = await wallet.sendTransaction({
          account: p.account,
          chain: wallet.chain,
          to: p.to,
          data: p.data,
          value: 0n,
          gas: fresh.gas,
        });
        row = { ...row, hash, status: "pending" };
        update(row);
      } catch (e) {
        const v = e as {
          code?: number;
          cause?: { code?: number };
          name?: string;
        };
        row = {
          ...row,
          status:
            v.code === 4001 ||
            v.cause?.code === 4001 ||
            v.name === "UserRejectedRequestError"
              ? "cancelled"
              : "uncertain",
        };
        update(row);
        throw e;
      }
      return row;
    },
  );
}
export async function recoverTransaction(row: Pending): Promise<Pending> {
  if (!row.hash)
    throw new Error(
      "This request has no known hash. Check the wallet activity before clearing it.",
    );
  await verifyRuntime();
  const receipt = await publicClient.getTransactionReceipt({ hash: row.hash });
  const block = await publicClient.getBlock({
    blockNumber: receipt.blockNumber,
  });
  if (block.hash !== receipt.blockHash)
    throw new Error(
      "Receipt changed after a chain reorganization. Check again.",
    );
  const head = await publicClient.getBlockNumber();
  if (head < receipt.blockNumber + 1n)
    throw new Error(
      "Waiting for two Ethereum confirmations. Check again shortly.",
    );
  const tx = await publicClient.getTransaction({ hash: row.hash });
  if (
    tx.from.toLowerCase() !== row.account.toLowerCase() ||
    (row.to && tx.to?.toLowerCase() !== row.to.toLowerCase()) ||
    (row.data && tx.input !== row.data)
  )
    throw new Error(
      "Transaction does not match the saved sender, contract and action.",
    );
  const minted = parseEventLogs({
    abi: passAbi,
    logs: receipt.logs,
    eventName: "Transfer",
  })
    .filter(
      (l) =>
        l.address.toLowerCase() === PASS.toLowerCase() &&
        l.args.from === "0x0000000000000000000000000000000000000000" &&
        l.args.to.toLowerCase() === row.account.toLowerCase(),
    )
    .map((l) => Number(l.args.tokenId));
  const next = {
    ...row,
    status:
      receipt.status === "success"
        ? ("confirmed" as const)
        : ("reverted" as const),
    mintedIds: minted,
  };
  update(next);
  return next;
}
