import { useEffect, useState } from "react";
import { useConnection, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  PASS,
  BMC,
  releaseBlockers,
  explorer,
  GENESIS_PRICE,
  MYSTERY_PRICE,
  routeHref,
} from "./config";
import { useCollection, useWalletData, amount, errorText } from "./data";
import {
  CollectionStats,
  External,
  Heading,
  Notice,
  Section,
  Stamp,
  Stat,
} from "./components";
import { Dialog } from "./Wallet";
import {
  prepareAction,
  submitAction,
  loadTransactions,
  recoverTransaction,
  clearUncertain,
  type Action,
  type Prepared,
  type Pending,
} from "./transactions";
export function Transactions() {
  const { address } = useConnection();
  const client = useQueryClient();
  const [rows, setRows] = useState(loadTransactions);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState<Pending | null>(null);
  const [resolutionChecked, setResolutionChecked] = useState(false);
  useEffect(() => {
    const reload = () => setRows(loadTransactions());
    addEventListener("bmc-transactions", reload);
    addEventListener("storage", reload);
    return () => {
      removeEventListener("bmc-transactions", reload);
      removeEventListener("storage", reload);
    };
  }, []);
  async function recover(r: Pending) {
    setBusy(r.hash || "");
    setMessage("");
    try {
      await recoverTransaction(r);
      await client.invalidateQueries();
      setMessage("Transaction receipt checked.");
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy("");
    }
  }
  const mine = rows.filter(
    (r) => r.account.toLowerCase() === address?.toLowerCase(),
  );
  return (
    <Section title="Transactions from this browser">
      <p className="muted small">
        Saved locally for this wallet on Ethereum. Wallet and Etherscan activity
        remain authoritative.
      </p>
      {!address ? (
        <p>Connect to recover pending transactions.</p>
      ) : !mine.length ? (
        <p>No transactions have been submitted from this browser.</p>
      ) : (
        <ul className="activity-list">
          {mine.map((r) => (
            <li key={r.createdAt}>
              <div>
                <strong>{r.label}</strong>
                <p>
                  {r.status === "wallet"
                    ? "Wallet request unresolved"
                    : r.status}{" "}
                  · {new Date(r.createdAt).toLocaleString()}
                </p>
                {r.mintedIds?.length ? (
                  <p>
                    Minted Pass {r.mintedIds.map((id) => `#${id}`).join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="row">
                {r.hash && (
                  <External href={explorer(r.hash, "tx")}>
                    View transaction
                  </External>
                )}
                {r.hash &&
                  ["pending", "uncertain", "wallet"].includes(r.status) && (
                    <button
                      className="btn btn-secondary"
                      disabled={!!busy}
                      onClick={() => void recover(r)}
                    >
                      {busy === r.hash ? "Checking…" : "Check receipt"}
                    </button>
                  )}
                {!r.hash && ["wallet", "uncertain"].includes(r.status) && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setResolutionChecked(false);
                      setUncertain(r);
                    }}
                  >
                    Resolve request
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="error">
        {message}
      </p>
      {uncertain && (
        <Dialog
          title="Resolve the wallet request"
          onClose={() => setUncertain(null)}
        >
          <div className="stack">
            <p>
              The wallet did not return a transaction hash. Check the connected
              wallet and Etherscan for a pending or completed transaction. Never
              submit again while its outcome is unknown.
            </p>
            <External href={explorer(uncertain.account)}>
              Check wallet on Etherscan
            </External>
            <label className="check-row">
              <input
                type="checkbox"
                id="request-resolved"
                checked={resolutionChecked}
                onChange={(e) => setResolutionChecked(e.target.checked)}
              />
              I checked the wallet. No transaction was submitted and no request
              is pending.
            </label>
            <button
              id="clear-request"
              disabled={!resolutionChecked}
              className="btn btn-secondary"
              onClick={() => {
                if (!resolutionChecked) return;
                try {
                  clearUncertain(uncertain);
                  setUncertain(null);
                } catch (e) {
                  setMessage(errorText(e));
                }
              }}
            >
              Clear this local request
            </button>
          </div>
        </Dialog>
      )}
    </Section>
  );
}
export function Mint() {
  const q = useCollection();
  const w = useWalletData();
  const { address, chainId } = useConnection();
  const wallet = useWalletClient();
  const queries = useQueryClient();
  const [phase, setPhase] = useState<"genesis" | "mystery">("genesis");
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const c = q.data;
  const blockers = releaseBlockers();
  const locked = blockers.length > 0;
  const price = phase === "genesis" ? GENESIS_PRICE : MYSTERY_PRICE;
  useEffect(() => {
    setPrepared(null);
    setAccepted(false);
    setMessage("");
  }, [address, chainId]);
  const ready =
    !locked &&
    !!address &&
    chainId === 1 &&
    !!wallet.data &&
    !busy &&
    !q.isError &&
    c.mode === "live";
  const phaseReady =
    phase === "genesis" ? c.minted < 40 : c.minted >= 40 && c.minted < 500;
  async function prepare(action: Action) {
    if (!address || !wallet.data) return;
    setBusy(true);
    setMessage("Simulating on Ethereum…");
    try {
      const p = await prepareAction(action, address, wallet.data);
      setPrepared(p);
      setAccepted(false);
      setMessage("");
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!prepared || !wallet.data || !accepted) return;
    setBusy(true);
    setMessage("Confirm this transaction in your wallet.");
    try {
      const row = await submitAction(prepared, wallet.data);
      setPrepared(null);
      setMessage("Transaction submitted. Waiting for its receipt…");
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await recoverTransaction(row);
        await queries.invalidateQueries();
        setMessage("Transaction confirmed.");
      } catch {
        setMessage(
          "Submitted. Use Check receipt below to confirm its outcome. No next transaction starts automatically.",
        );
      }
    } catch (e) {
      setPrepared(null);
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading title="Mint a BMC Pass">
        500 Ethereum collectibles. Every successful mint permanently burns BMC.
      </Heading>
      <CollectionStats data={c} />
      <Stamp
        data={c}
        error={q.error}
        loading={q.isFetching}
        onRefresh={() => void q.refetch()}
      />
      {locked && (
        <Notice
          title="Website minting awaits release approval"
          tone="notice-warn"
        >
          <p>
            The contract’s minting state is {c.mintingOpen ? "open" : "closed"}{" "}
            at the block above. This website keeps approvals, mints and reveals
            locked until the remaining launch checks are accepted.
          </p>
          <details>
            <summary>View the remaining launch checks</summary>
            <ul>
              {blockers.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p>
              <a href={routeHref("verification")}>
                Read deployment verification
              </a>
            </p>
          </details>
        </Notice>
      )}
      <div className="mint-layout">
        <section className="mint-panel stack" aria-labelledby="mint-title">
          <h2 id="mint-title">Choose your Pass</h2>
          <div className="segmented" aria-label="Mint phase">
            <button
              aria-pressed={phase === "genesis"}
              onClick={() => setPhase("genesis")}
            >
              Genesis · #1–40
            </button>
            <button
              aria-pressed={phase === "mystery"}
              onClick={() => setPhase("mystery")}
            >
              Mystery · #41–500
            </button>
          </div>
          <p className="mint-price">
            {amount(price, 18, 0)} <span>BMC / Pass</span>
          </p>
          <p>
            {phase === "genesis"
              ? "Sequential Genesis artwork. #1 is Legendary Genesis; #2–40 are Early Genesis."
              : "Mystery opens after 40 Genesis mints. A later reveal draws from 37 Genesis and 423 Standard artworks."}
          </p>
          <dl className="kv">
            <div>
              <dt>Quantity</dt>
              <dd>1 Pass</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>BMC permanently burned</dd>
            </div>
            <div>
              <dt>Network fee</dt>
              <dd>ETH gas, estimated before signing</dd>
            </div>
            <div>
              <dt>Your BMC</dt>
              <dd>
                {address
                  ? w.data
                    ? amount(w.data.bmc)
                    : w.isPending
                      ? "Loading…"
                      : "Unavailable"
                  : "Connect wallet"}
              </dd>
            </div>
            <div>
              <dt>Allowance to this collection</dt>
              <dd>
                {w.data ? `${amount(w.data.allowance)} BMC` : "Not loaded"}
              </dd>
            </div>
          </dl>
          {!phaseReady && (
            <p className="gold">
              {phase === "mystery"
                ? "Mystery minting starts after all 40 Genesis Passes are minted."
                : "The Genesis phase has sold out."}
            </p>
          )}
          <div className="row">
            {w.data && w.data.allowance !== 0n && w.data.allowance !== price ? (
              <button
                className="btn btn-secondary"
                disabled={!ready}
                onClick={() => void prepare("revoke")}
              >
                Revoke existing allowance
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                disabled={!ready || !phaseReady || w.data?.allowance === price}
                onClick={() => void prepare("approve")}
              >
                1. Approve exact BMC
              </button>
            )}
            <button
              className="btn btn-primary"
              disabled={!ready || !phaseReady || w.data?.allowance !== price}
              onClick={() => void prepare(phase)}
            >
              2. Mint {phase === "genesis" ? "Genesis" : "Mystery"}
            </button>
          </div>
          <p className="small muted">
            {!address
              ? "Use Connect in the header to load your wallet."
              : chainId !== 1
                ? "Switch to Ethereum using the wallet control."
                : "An approval and a mint are separate transactions. Confirm each one yourself."}{" "}
            No unlimited approval or automatic mint.
          </p>
        </section>
        <aside className="stack mint-explanation">
          <h2>Know before you mint</h2>
          <ol className="steps">
            <li>Check the Ethereum collection address below.</li>
            <li>
              Approve exactly one mint price, then review the separate mint.
            </li>
            <li>
              Successful mints burn BMC irreversibly. Network fees can apply
              even if a transaction reverts.
            </li>
            <li>
              Mystery Passes need a separate reveal. No BMC is burned to reveal.
            </li>
          </ol>
          <Notice title="Mystery randomness has limits">
            <p>
              The contract uses a future Ethereum block hash. Block producers
              can influence outcomes. It is not cryptographically fair
              randomness.
            </p>
          </Notice>
          <p className="small">
            Reveal within 8,191 blocks of the reveal block (roughly 27 hours).
            Late reveals settle as Standard, except when that inventory is
            exhausted.
          </p>
          <a href={routeHref("pass")} className="btn btn-secondary">
            Explore the collection
          </a>
        </aside>
      </div>
      <Section title="Reveal pending Passes">
        <p>
          {c.pending
            ? `${c.pending} Passes are waiting for reveal. The queue is settled in mint order.`
            : "No pending reveals at the displayed block. Mystery mints will appear here."}
        </p>
        <button
          className="btn btn-secondary"
          disabled={!ready || c.pending === 0}
          onClick={() => void prepare("reveal")}
        >
          Review reveal
        </button>
      </Section>
      <p role="status" className="status-line">
        {message}
      </p>
      <Transactions />
      <Section title="Contract destinations">
        <dl className="kv">
          <div>
            <dt>BMC approval contract</dt>
            <dd>
              <External href={explorer(BMC)}>
                <span className="address">{BMC}</span>
              </External>
            </dd>
          </div>
          <div>
            <dt>Pass collection and spender</dt>
            <dd>
              <External href={explorer(PASS)}>
                <span className="address">{PASS}</span>
              </External>
            </dd>
          </div>
        </dl>
      </Section>
      {prepared && (
        <Dialog
          title={prepared.label}
          onClose={() => {
            if (!busy) setPrepared(null);
          }}
        >
          <div className="stack">
            <dl className="kv">
              <div>
                <dt>Network</dt>
                <dd>Ethereum Mainnet</dd>
              </div>
              <div>
                <dt>From</dt>
                <dd className="address">{prepared.account}</dd>
              </div>
              <div>
                <dt>Contract</dt>
                <dd className="address">{prepared.to}</dd>
              </div>
              <div>
                <dt>
                  BMC {prepared.action === "approve" ? "allowance" : "burn"}
                </dt>
                <dd>{amount(prepared.amount)}</dd>
              </div>
              <div>
                <dt>Conservative fee estimate</dt>
                <dd>
                  {amount(prepared.gas * prepared.maxFeePerGas, 18, 8)} ETH
                </dd>
              </div>
            </dl>
            <p>
              The wallet sets the final network fee. This simulation expires
              after 60 seconds.
            </p>
            <label className="check-row">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              I reviewed the contract and amount
              {prepared.action === "genesis" || prepared.action === "mystery"
                ? " and understand that the BMC burn is irreversible"
                : ""}
              .
            </label>
            <button
              className="btn btn-primary"
              disabled={!accepted || busy}
              onClick={() => void send()}
            >
              {busy
                ? "Waiting for wallet…"
                : `Confirm ${prepared.action === "approve" ? "exact approval" : prepared.action === "revoke" ? "revocation" : prepared.action === "reveal" ? "reveal" : "mint and burn"}`}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
