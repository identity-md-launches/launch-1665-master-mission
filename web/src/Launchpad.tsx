import { useState } from "react";
import { useConnection } from "wagmi";
import { encodeAbiParameters, keccak256, parseAbiParameters } from "viem";
import { useWalletData, errorText } from "./data";
import { safeURL } from "./metadata";
import { PASS, routeHref } from "./config";
import { Heading, Notice, Section, Stamp, Stat } from "./components";
export type LaunchDraft = {
  name: string;
  ticker: string;
  description: string;
  website: string;
  x: string;
  telegram: string;
  discord: string;
  holderAllocation: boolean;
  logo?: string;
};
export function validateDraft(d: LaunchDraft) {
  const name = d.name.trim();
  const ticker = d.ticker.trim().toUpperCase();
  if (name.length < 1 || name.length > 64)
    throw new Error("Enter a token name of 1–64 characters.");
  if (!/^[A-Z0-9]{1,10}$/.test(ticker))
    throw new Error("Use 1–10 letters or numbers for the ticker.");
  if (d.description.length > 1000)
    throw new Error("Keep the description to 1,000 characters.");
  const links = Object.fromEntries(
    ["website", "x", "telegram", "discord"].map((k) => [
      k,
      safeURL(d[k as keyof LaunchDraft] as string),
    ]),
  );
  return {
    version: 1,
    status: "LOCAL_DRAFT_NOT_DEPLOYED",
    name,
    ticker,
    description: d.description.trim(),
    ...links,
    logo: d.logo,
    holderAllocation: d.holderAllocation,
    chain: null,
    factory: null,
    feeProposal: {
      creationFee: 0,
      networkGasMayApply: true,
      tradingFeeBasisPoints: 100,
      split: { creator: 34, imdBurn: 33, bmcBurn: 33 },
    },
    holderClaims: d.holderAllocation
      ? {
          collectionChainId: 1,
          collection: PASS,
          allocationUnit: "one per eligible NFT",
          funded: false,
          snapshot: null,
          claimContract: null,
        }
      : null,
  };
}
export function feeAllocation(tradeWei: bigint) {
  if (tradeWei < 0n) throw new Error("Amount cannot be negative.");
  const fee = tradeWei / 100n;
  const creator = (fee * 34n) / 100n;
  const imd = (fee * 33n) / 100n;
  return { fee, creator, imd, bmc: fee - creator - imd };
}
export function snapshotLeaf(
  chainId: bigint,
  collection: `0x${string}`,
  blockHash: `0x${string}`,
  tokenId: bigint,
  owner: `0x${string}`,
) {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("uint256,address,bytes32,uint256,address"),
      [chainId, collection, blockHash, tokenId, owner],
    ),
  );
}
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Launchpad() {
  const [d, setD] = useState<LaunchDraft>({
    name: "",
    ticker: "",
    description: "",
    website: "",
    x: "",
    telegram: "",
    discord: "",
    holderAllocation: false,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [optional, setOptional] = useState(false);
  const [tab, setTab] = useState("Create");
  const [preview, setPreview] = useState<ReturnType<
    typeof validateDraft
  > | null>(null);
  const set = (k: keyof LaunchDraft, v: string | boolean) =>
    setD({ ...d, [k]: v });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const draft = validateDraft(d);
      setPreview(draft);
      download(`bmc-launchpad-${draft.ticker.toLowerCase()}-draft.json`, draft);
      setMessage(
        "Draft downloaded to your device. No token was created and nothing was uploaded.",
      );
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function logo(file?: File) {
    setError("");
    if (!file) {
      setD({ ...d, logo: undefined });
      return;
    }
    try {
      if (
        file.size > 256 * 1024 ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.type)
      )
        throw new Error("Choose a PNG, JPEG or WebP logo up to 256 KB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const valid =
        file.type === "image/png"
          ? bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
          : file.type === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216
            : new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
              new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
      if (!valid)
        throw new Error("The logo contents do not match the image type.");
      const reader = new FileReader();
      reader.onload = () =>
        setD((v) => ({ ...v, logo: reader.result as string }));
      reader.readAsDataURL(file);
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <>
      <Heading title="BMC Launchpad">
        Prepare a token idea. Creation and trading await verified IMD
        infrastructure.
      </Heading>
      <Notice title="Planning only · Financial operations disabled">
        <p>
          No launchpad factory, trading router, bridge or funded claim contract
          has been authorized. Drafts stay on your device.
        </p>
      </Notice>
      <nav className="segmented" aria-label="Launchpad views">
        {["Create", "Discover", "Creator dashboard"].map((v) => (
          <button key={v} aria-pressed={tab === v} onClick={() => setTab(v)}>
            {v}
          </button>
        ))}
      </nav>
      {tab === "Create" ? (
        <div className="launch-layout">
          <form className="stack" onSubmit={submit}>
            <h2>Create a token draft</h2>
            <label className="field">
              Token name
              <input
                required
                maxLength={64}
                value={d.name}
                onChange={(e) => set("name", e.target.value)}
                autoComplete="off"
                placeholder="Your token name"
              />
            </label>
            <label className="field">
              Ticker
              <input
                required
                maxLength={10}
                pattern="[A-Za-z0-9]{1,10}"
                value={d.ticker}
                onChange={(e) => set("ticker", e.target.value)}
                autoComplete="off"
                placeholder="TICKER"
              />
            </label>
            <button
              className="text-button"
              type="button"
              aria-expanded={optional}
              onClick={() => setOptional(!optional)}
            >
              {optional ? "Hide" : "Add"} optional details
            </button>
            {optional && (
              <>
                <label className="field">
                  Logo · PNG, JPEG or WebP, up to 256 KB
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => void logo(e.target.files?.[0])}
                  />
                </label>
                {d.logo && (
                  <img
                    className="draft-logo"
                    src={d.logo}
                    alt="Your draft token logo"
                  />
                )}
                <label className="field">
                  Description
                  <textarea
                    maxLength={1000}
                    rows={4}
                    value={d.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </label>
                {[
                  ["website", "Website"],
                  ["x", "X / Twitter"],
                  ["telegram", "Telegram"],
                  ["discord", "Discord"],
                ].map(([k, label]) => (
                  <label className="field" key={k}>
                    {label}
                    <input
                      type="url"
                      value={d[k as keyof LaunchDraft] as string}
                      onChange={(e) =>
                        set(k as keyof LaunchDraft, e.target.value)
                      }
                      placeholder="https://"
                    />
                  </label>
                ))}
              </>
            )}
            <label className="check-row">
              <input
                type="checkbox"
                checked={d.holderAllocation}
                onChange={(e) => set("holderAllocation", e.target.checked)}
              />
              Plan a free allocation for BMC Pass holders
            </label>
            <p className="small muted">
              One allocation per eligible NFT, including multiple Passes per
              wallet. This option does not fund or promise an airdrop.
            </p>
            <p className="error" role="alert">
              {error}
            </p>
            <button className="btn btn-primary" type="submit">
              Download token draft
            </button>
            <button className="btn btn-secondary" type="button" disabled>
              Create token on IMD · Not available
            </button>
            <p role="status">{message}</p>
          </form>
          <aside className="stack">
            <h2>Proposed economics</h2>
            <dl className="kv">
              <div>
                <dt>Platform creation fee</dt>
                <dd>None proposed</dd>
              </div>
              <div>
                <dt>Network gas</dt>
                <dd>May apply</dd>
              </div>
              <div>
                <dt>Trading currency</dt>
                <dd>ETH on IMD · Unverified</dd>
              </div>
              <div>
                <dt>Trading fee</dt>
                <dd>1% proposed</dd>
              </div>
            </dl>
            <div
              className="fee-split"
              aria-label="Proposed split of the one percent trading fee"
            >
              <span>34% creator</span>
              <span>33% IMD burn</span>
              <span>33% BMC burn</span>
            </div>
            <p className="small muted">
              These percentages divide the fee, not the whole trade. For a 1 ETH
              trade, the proposal allocates 0.0034 ETH to the creator and 0.0033
              ETH to each conversion route. Token quantities cannot be known
              without executable liquidity quotes.
            </p>
            <p>
              Bonding-curve trading, price charts, fee tracking and transparent
              burn history require deployed, indexed contracts. No sample market
              data is presented as live.
            </p>
          </aside>
        </div>
      ) : tab === "Discover" ? (
        <Section title="Token discovery">
          <p>
            No verified BMC Launchpad registry is configured. There are no
            authenticated launchpad tokens or charts to display.
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => setTab("Create")}
          >
            Prepare a token draft
          </button>
        </Section>
      ) : (
        <Section title="Creator dashboard">
          {preview ? (
            <div className="stack">
              <h3>
                {preview.name} ({preview.ticker})
              </h3>
              <p>Local draft in this tab · Not deployed</p>
              <p>{preview.description || "No description supplied."}</p>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  download(
                    `bmc-launchpad-${preview.ticker.toLowerCase()}-draft.json`,
                    preview,
                  )
                }
              >
                Download draft again
              </button>
            </div>
          ) : (
            <p>
              No token draft in this tab. Create a draft to preview it here.
            </p>
          )}
          <div className="grid grid-3">
            <Stat label="Trading fees" value="Not available" />
            <Stat label="Creator earnings" value="Not available" />
            <Stat label="Launchpad burns" value="Not available" />
          </div>
        </Section>
      )}
      <Section title="Before launchpad trading opens">
        <ol className="steps">
          <li>
            Verify the official IMD chain, chain ID, explorer, public RPC and
            actual ETH denomination.
          </li>
          <li>
            Authenticate genuine IMD and BMC assets, bridge security and usable
            conversion liquidity.
          </li>
          <li>
            Test bonding-curve accounting, reserve solvency, slippage, fee
            splits and real burn effects.
          </li>
          <li>
            Review contracts independently and authorize a separate financial
            release.
          </li>
        </ol>
      </Section>
      <Utility />
    </>
  );
}
export function Utility() {
  const { address } = useConnection();
  const w = useWalletData();
  return (
    <Section title="Pass holder benefits">
      <div className="grid grid-3">
        <Stat
          label="Verified Passes in your wallet"
          value={
            address
              ? w.data
                ? w.data.ids.length
                : w.isPending
                  ? "Loading…"
                  : "Unavailable"
              : "Connect wallet"
          }
        />
        <Stat label="Funded airdrops" value="None verified" />
        <Stat label="Claimable allocations" value="Not available" />
      </div>
      {w.data && <Stamp data={w.data} />}
      <p>
        Creators may choose to fund one allocation per eligible Pass. Multiple
        NFTs can qualify for multiple allocations. No campaign or claim contract
        is verified yet.
      </p>
      <div className="row">
        <button className="btn btn-secondary" disabled>
          Claim rewards · No funded campaign
        </button>
        <a href={routeHref("pass")}>View Pass collection</a>
      </div>
      <details>
        <summary>How ownership and future claims are protected</summary>
        <p>
          Planned snapshots pin Ethereum chain ID, collection, token ID, owner
          and finalized block hash. Claims must bind a unique campaign,
          destination chain, claim contract and recipient, consume each eligible
          NFT only once, and verify a reviewed cross-chain proof. Signatures, if
          required, must be domain-separated and support contract wallets.
        </p>
        <p>
          Ownership proof must never request NFT custody, NFT approvals or a
          seed phrase. The design remains inactive until funded contracts and
          their replay protection are tested and reviewed.
        </p>
      </details>
      <p className="small muted">
        Upcoming airdrops: none confirmed. Claim history: unavailable until an
        authenticated claim program exists.
      </p>
    </Section>
  );
}
