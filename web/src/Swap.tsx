import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAddress,
  keccak256,
  parseAbi,
  parseUnits,
  type Address,
} from "viem";
import { BMC, explorer, publicClient } from "./config";
import { amount, errorText, verifyRuntime } from "./data";
import { External, Heading, Notice, Section, Stamp, Stat } from "./components";
import pool from "./pool-snapshot.json";
const STATE = getAddress(pool.stateView),
  HOOK = getAddress(pool.hook),
  QUOTER = getAddress("0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203");
const stateAbi = parseAbi([
  "function getLiquidity(bytes32) view returns (uint128)",
  "function getSlot0(bytes32) view returns (uint160 sqrtPriceX96,int24 tick,uint24 protocolFee,uint24 lpFee)",
]);
const hookAbi = parseAbi([
  "function buyFeeBps() view returns (uint256)",
  "function sellBurnBps() view returns (uint256)",
  "function feeRecipient() view returns (address)",
  "function token() view returns (address)",
  "function poolManager() view returns (address)",
]);
const quoteAbi = parseAbi([
  "function quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) returns (uint256 amountOut,uint256 gasEstimate)",
]);
export function minReceived(output: bigint, bps: number) {
  if (!Number.isInteger(bps) || bps < 1 || bps > 500)
    throw new Error("Choose slippage between 0.01% and 5%.");
  return (output * BigInt(10000 - bps)) / 10000n;
}
export async function readPool() {
  const b = await publicClient.getBlock();
  await verifyRuntime(b.number);
  const codes = await Promise.all(
    [HOOK, STATE, QUOTER].map((address) =>
      publicClient.getCode({ address, blockNumber: b.number }),
    ),
  );
  const hashes = [
    pool.hookRuntimeKeccak,
    pool.stateRuntimeKeccak,
    pool.quoterRuntimeKeccak,
  ];
  if (codes.some((code, i) => !code || keccak256(code) !== hashes[i]))
    throw new Error(
      "Pool infrastructure bytecode differs from the verified deployment.",
    );
  const [liquidity, slot, buyFee, sellFee, recipient, token, manager] =
    await Promise.all([
      publicClient.readContract({
        address: STATE,
        abi: stateAbi,
        functionName: "getLiquidity",
        args: [pool.poolId as `0x${string}`],
        blockNumber: b.number,
      }),
      publicClient.readContract({
        address: STATE,
        abi: stateAbi,
        functionName: "getSlot0",
        args: [pool.poolId as `0x${string}`],
        blockNumber: b.number,
      }),
      publicClient.readContract({
        address: HOOK,
        abi: hookAbi,
        functionName: "buyFeeBps",
        blockNumber: b.number,
      }),
      publicClient.readContract({
        address: HOOK,
        abi: hookAbi,
        functionName: "sellBurnBps",
        blockNumber: b.number,
      }),
      publicClient.readContract({
        address: HOOK,
        abi: hookAbi,
        functionName: "feeRecipient",
        blockNumber: b.number,
      }),
      publicClient.readContract({
        address: HOOK,
        abi: hookAbi,
        functionName: "token",
        blockNumber: b.number,
      }),
      publicClient.readContract({
        address: HOOK,
        abi: hookAbi,
        functionName: "poolManager",
        blockNumber: b.number,
      }),
    ]);
  if (
    getAddress(token) !== BMC ||
    getAddress(manager) !== getAddress(pool.poolManager)
  )
    throw new Error(
      "The pool hook does not match the expected BMC token and PoolManager.",
    );
  return {
    block: b.number,
    timestamp: Number(b.timestamp),
    liquidity,
    sqrt: slot[0],
    lpFee: slot[3],
    protocolFee: slot[2],
    buyFee,
    sellFee,
    recipient,
  };
}
type Quote = {
  output: bigint;
  minimum: bigint;
  input: bigint;
  created: number;
  block: bigint;
  timestamp: number;
  gas: bigint;
  spotOutput: bigint;
  hookFee: bigint;
  buy: boolean;
  slippage: number;
};
export function Swap() {
  const q = useQuery({
    queryKey: ["pool"],
    queryFn: readPool,
    staleTime: 30_000,
    retry: 0,
  });
  const [buy, setBuy] = useState(true);
  const [input, setInput] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function getQuote(e: React.FormEvent) {
    e.preventDefault();
    setQuote(null);
    setError("");
    setBusy(true);
    try {
      if (!/^\d+(\.\d{1,18})?$/.test(input))
        throw new Error(
          "Enter a positive amount with at most 18 decimal places.",
        );
      const value = parseUnits(input, 18);
      if (value <= 0n || value >= 2n ** 128n)
        throw new Error("Enter an amount above zero within the pool limit.");
      const bps = Number(slippage) * 100;
      minReceived(1n, bps);
      const state = await readPool();
      if (state.liquidity === 0n)
        throw new Error("The pool currently has no active liquidity.");
      const r = await publicClient.simulateContract({
        address: QUOTER,
        abi: quoteAbi,
        functionName: "quoteExactInputSingle",
        args: [
          {
            poolKey: {
              currency0: pool.currency0 as Address,
              currency1: BMC,
              fee: pool.fee,
              tickSpacing: pool.tickSpacing,
              hooks: HOOK,
            },
            zeroForOne: buy,
            exactAmount: value,
            hookData: "0x",
          },
        ],
        blockNumber: state.block,
      });
      const [output, gas] = r.result;
      if (output === 0n) throw new Error("This route returned no output.");
      const square = state.sqrt * state.sqrt;
      const spotOutput = buy
        ? (value * square) / 2n ** 192n
        : (value * 2n ** 192n) / square;
      setQuote({
        output,
        minimum: minReceived(output, bps),
        input: value,
        created: Date.now(),
        block: state.block,
        timestamp: state.timestamp,
        gas,
        spotOutput,
        hookFee: (value * (buy ? state.buyFee : state.sellFee)) / 10000n,
        buy,
        slippage: bps,
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading title="Swap BMC">
        Explore the verified native-ETH / BMC pool on Ethereum.
      </Heading>
      <Notice title="Quotes available · In-site swaps disabled">
        <p>
          Pool existence and active liquidity are verified. Executing swaps here
          awaits a reviewed router integration, hook-risk acceptance and release
          authorization. A quote never sends a transaction.
        </p>
      </Notice>
      <div className="swap-layout">
        <form className="stack" onSubmit={getQuote}>
          <h2>Check a live quote</h2>
          <div className="segmented" aria-label="Swap direction">
            <button
              type="button"
              aria-pressed={buy}
              onClick={() => {
                setBuy(true);
                setQuote(null);
              }}
            >
              Buy BMC
            </button>
            <button
              type="button"
              aria-pressed={!buy}
              onClick={() => {
                setBuy(false);
                setQuote(null);
              }}
            >
              Sell BMC
            </button>
          </div>
          <label className="field">
            You pay · {buy ? "ETH" : "BMC"}
            <input
              required
              inputMode="decimal"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setQuote(null);
              }}
              placeholder="0.00"
            />
          </label>
          <label className="field">
            Slippage tolerance
            <select
              value={slippage}
              onChange={(e) => {
                setSlippage(e.target.value);
                setQuote(null);
              }}
            >
              <option value="0.1">0.1%</option>
              <option value="0.5">0.5%</option>
              <option value="1">1%</option>
              <option value="3">3%</option>
            </select>
          </label>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Simulating quote…" : "Get a quote"}
          </button>
          <p className="error" role="status">
            {error}
          </p>
          {quote && (
            <div className="quote stack" role="status">
              <Stat
                label={`Estimated ${buy ? "BMC" : "ETH"} received`}
                value={amount(quote.output, 18, buy ? 4 : 8)}
              />
              <dl className="kv">
                <div>
                  <dt>Minimum at {slippage}% slippage</dt>
                  <dd>
                    {amount(quote.minimum, 18, buy ? 4 : 8)}{" "}
                    {buy ? "BMC" : "ETH"}
                  </dd>
                </div>
                <div>
                  <dt>Execution versus spot, including fees</dt>
                  <dd>
                    {quote.spotOutput
                      ? `${(Number(((quote.spotOutput - quote.output) * 10000n) / quote.spotOutput) / 100).toFixed(2)}%`
                      : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt>{buy ? "ETH hook fee" : "BMC hook burn"}</dt>
                  <dd>
                    {amount(quote.hookFee, 18, 8)} {buy ? "ETH" : "BMC"}
                  </dd>
                </div>
                <div>
                  <dt>Platform transaction fee</dt>
                  <dd>None collected here</dd>
                </div>
                <div>
                  <dt>Execution gas</dt>
                  <dd>
                    Quoted gas units: {String(quote.gas)}; ETH fee not estimated
                  </dd>
                </div>
              </dl>
              <Stamp data={quote} />
              <p className="small muted">
                Indicative result at this block. Requote before a trade; the
                external exchange will calculate its own quote, slippage and
                fees. This is not an executable order.
              </p>
            </div>
          )}
          <button className="btn btn-secondary" type="button" disabled>
            Swap in this site · Release pending
          </button>
          <External
            href={`https://app.uniswap.org/swap?chain=mainnet&inputCurrency=${buy ? "ETH" : BMC}&outputCurrency=${buy ? BMC : "ETH"}`}
            className="btn btn-secondary"
          >
            Open Uniswap ↗
          </External>
          <p className="small muted">
            External app. Route availability and fees must be checked there.
            This link does not approve or submit a trade.
          </p>
        </form>
        <aside className="stack">
          <h2>Verified pool</h2>
          <dl className="kv">
            <div>
              <dt>Protocol</dt>
              <dd>Uniswap v4 · Ethereum</dd>
            </div>
            <div>
              <dt>Pair</dt>
              <dd>Native ETH / BMC</dd>
            </div>
            <div>
              <dt>Active liquidity units</dt>
              <dd>
                {q.data
                  ? String(q.data.liquidity)
                  : q.isPending
                    ? "Loading…"
                    : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Liquidity-provider fee</dt>
              <dd>{q.data ? `${q.data.lpFee / 10000}%` : "Unavailable"}</dd>
            </div>
            <div>
              <dt>Hook buy fee</dt>
              <dd>
                {q.data
                  ? `${Number(q.data.buyFee) / 100}% of ETH input`
                  : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Hook sell burn</dt>
              <dd>
                {q.data
                  ? `${Number(q.data.sellFee) / 100}% of BMC input`
                  : "Unavailable"}
              </dd>
            </div>
          </dl>
          <p className="small muted">
            Liquidity units are not a currency balance or a USD valuation. Pool
            fees and hook fees both affect execution.
          </p>
          {q.data && (
            <Stamp
              data={q.data}
              loading={q.isFetching}
              onRefresh={() => void q.refetch()}
            />
          )}{" "}
          {q.isError && (
            <>
              <p className="error">
                Pool reads unavailable. {errorText(q.error)}
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => void q.refetch()}
              >
                Retry pool data
              </button>
            </>
          )}
          <External href={explorer(pool.initializationTransaction, "tx")}>
            Pool initialization receipt
          </External>
          <External href={explorer(HOOK)}>Inspect the pool hook</External>
        </aside>
      </div>
      <Section title="Pool identity">
        <p className="address">Pool ID: {pool.poolId}</p>
        <p className="address">PoolManager: {pool.poolManager}</p>
        <p className="address">BMC: {BMC}</p>
        <p>
          The token itself has no transfer fee. This pool’s immutable hook
          charges an ETH buy fee and burns part of BMC sells. These are
          different from the proposed future launchpad fee.
        </p>
      </Section>
    </>
  );
}
