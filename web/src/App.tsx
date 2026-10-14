import { useEffect, useRef, useState, type ReactNode } from "react";
import { useConnection } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  BMC,
  PASS,
  FOUNDER,
  LINKS,
  RELEASE,
  asset,
  explorer,
  routeHref,
  sourceSnapshot,
  shortAddress,
  releaseBlockers,
} from "./config";
import {
  amount,
  errorText,
  useActivity,
  useCollection,
  useWalletData,
} from "./data";
import { tokenIdInput } from "./metadata";
import {
  CollectionStats,
  Emblem,
  External,
  Heading,
  NFTCard,
  NFTImage,
  Notice,
  Section,
  Stamp,
  Stat,
} from "./components";
import { ConnectControl } from "./Wallet";
import { Mint, Transactions } from "./Mint";
import { Launchpad, Utility } from "./Launchpad";
import { Swap } from "./Swap";
const routes = [
  ["", "Home"],
  ["mint", "NFT Mint"],
  ["pass", "Collection"],
  ["dashboard", "Dashboard"],
  ["staking", "Staking"],
  ["swap", "Swap"],
  ["burns", "Burns"],
  ["launchpad", "Launchpad"],
  ["community", "Community"],
] as const;
function ProjectLinks() {
  return (
    <div className="project-links">
      <External href={LINKS.github}>GitHub</External>
      <External href={explorer(BMC, "token")}>Etherscan</External>
      <External href={LINKS.imd}>IMD</External>
      {LINKS.x ? (
        <External href={LINKS.x}>X / Twitter</External>
      ) : (
        <span className="muted">X · Unconfirmed</span>
      )}
      {LINKS.telegram ? (
        <External href={LINKS.telegram}>Telegram</External>
      ) : (
        <span className="muted">Telegram · Unconfirmed</span>
      )}
    </div>
  );
}
function Home() {
  const q = useCollection();
  const c = q.data;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1 className="hero-title">Enter BMC Illuminati</h1>
          <p className="hero-sub">
            500 Ethereum collectibles. Mint a Pass by permanently burning BMC.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={routeHref("mint")}>
              Explore NFT minting
            </a>
            <a className="btn btn-secondary" href={routeHref("dashboard")}>
              Open dashboard
            </a>
            <a className="btn btn-secondary" href={routeHref("staking")}>
              Explore staking
            </a>
          </div>
          <div className="hero-trust">
            <span>Ethereum Mainnet</span>
            <span>500 Passes · Fixed cap</span>
          </div>
          <p className="hero-slogan">Know · Create · Burn · Rise</p>
        </div>
        <figure className="hero-visual real-art">
          <a
            href={routeHref("pass")}
            aria-label="View Legendary Genesis Pass number 1"
          >
            <img
              src={asset("artwork/genesis-01.webp")}
              width="1024"
              height="1024"
              alt="Authentic Legendary Genesis #1: a crowned, hooded frog in a gold temple"
              fetchPriority="high"
            />
          </a>
          <figcaption>
            <span>Genesis #01</span>
            <span>Legendary · Authentic IPFS artwork</span>
          </figcaption>
        </figure>
      </section>
      <section className="section home-status">
        <CollectionStats data={c} />
        <Stamp
          data={c}
          error={q.error}
          loading={q.isFetching}
          onRefresh={() => void q.refetch()}
        />
      </section>
      <Notice title="Your Genesis Pass, now visible">
        <p>
          The gallery reads the official collection at{" "}
          <span className="address">{PASS}</span>. The authentic #1 artwork is
          bundled locally from the same IPFS CID, with every image pixel
          preserved.
        </p>
        <a href={routeHref("pass")}>View Genesis #1, attributes and owner</a>
      </Notice>
      <Section title="How the ecosystem works">
        <p className="muted">
          One Ethereum token. Collectibles, swaps, staking and community tools,
          with their status shown clearly.
        </p>
        <div className="grid grid-4">
          <Feature title="BMC Pass" to="pass">
            500 ERC-721 collectibles: 77 Genesis artworks and 423 Standard
            artworks. Every successful mint burns BMC forever.
          </Feature>
          <Feature title="Swap BMC" to="swap">
            Explore the verified BMC/native-ETH pool and check a real quote
            before considering a trade.
          </Feature>
          <Feature title="IMD Burn Center" to="burns">
            Track actual BMC burns. IMD burns and manual buybacks await an
            authenticated contract and verifiable records.
          </Feature>
          <Feature title="Staking" to="staking">
            Review the proposed BMC, NFT and combined staking program. Deposits
            await a verified, funded deployment.
          </Feature>
        </div>
      </Section>
      <Section title="Know what is live">
        <div className="status-table">
          <div>
            <strong>Genesis gallery & wallet reads</strong>
            <span>Available · Ethereum</span>
          </div>
          <div>
            <strong>NFT mint, approval & reveal</strong>
            <span>Contract open · Website release pending</span>
          </div>
          <div>
            <strong>Staking deposits</strong>
            <span>No verified deployment</span>
          </div>
          <div>
            <strong>Launchpad & holder claims</strong>
            <span>Planning · No funded campaigns</span>
          </div>
        </div>
        <a href={routeHref("verification")}>Read the verification record</a>
      </Section>
    </>
  );
}
function Feature({
  title,
  to,
  children,
}: {
  title: string;
  to: string;
  children: ReactNode;
}) {
  return (
    <article className="feature">
      <h3>{title}</h3>
      <p>{children}</p>
      <a href={routeHref(to)}>
        Explore {title}
        <span aria-hidden="true"> →</span>
      </a>
    </article>
  );
}
function ArtworkArchive() {
  const [kind, setKind] = useState<"genesis" | "standard">("genesis");
  const [page, setPage] = useState(0);
  const total = kind === "genesis" ? 77 : 12;
  return (
    <Section title="Original artwork gallery">
      <p className="muted">
        Preserved collection previews. Artwork numbers are not token IDs or
        proof that a Pass has been minted. Current ownership appears in the
        minted gallery above.
      </p>
      <details>
        <summary>Browse all original artwork previews</summary>
        <div className="stack">
          <div className="segmented" aria-label="Artwork category">
            <button
              aria-pressed={kind === "genesis"}
              onClick={() => {
                setKind("genesis");
                setPage(0);
              }}
            >
              77 Genesis artworks
            </button>
            <button
              aria-pressed={kind === "standard"}
              onClick={() => {
                setKind("standard");
                setPage(0);
              }}
            >
              12 Standard previews
            </button>
          </div>
          <div className="art-grid">
            {Array.from(
              { length: Math.min(12, total - page * 12) },
              (_, i) => page * 12 + i + 1,
            ).map((id) => (
              <figure key={kind + id}>
                <img
                  src={asset(
                    `artwork/${kind}/${kind}-${kind === "genesis" ? String(id).padStart(2, "0") : id}.${kind === "genesis" ? "webp" : "svg"}`,
                  )}
                  alt={`${kind === "genesis" ? "Genesis" : "Standard"} artwork preview ${id}`}
                  width="320"
                  height="320"
                  loading="lazy"
                />
                <figcaption>
                  {kind === "genesis" ? "Genesis" : "Standard"} artwork {id}
                  <span>Preview only</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="row">
            <button
              className="btn btn-secondary"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous artworks
            </button>
            <span>
              Page {page + 1} of {Math.ceil(total / 12)}
            </span>
            <button
              className="btn btn-secondary"
              disabled={(page + 1) * 12 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next artworks
            </button>
          </div>
        </div>
      </details>
    </Section>
  );
}
function Collection() {
  const q = useCollection();
  const w = useWalletData();
  const { address } = useConnection();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [lookup, setLookup] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [address, filter]);
  const ids =
    filter === "mine"
      ? w.data?.ids || []
      : Array.from({ length: q.data.minted }, (_, i) => i + 1).filter((id) =>
          filter === "genesis"
            ? id <= 40
            : filter === "mystery"
              ? id > 40
              : true,
        );
  function find(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const id = tokenIdInput(lookup);
      if (q.data.mode === "live" && id > q.data.minted)
        throw new Error(
          `Pass #${id} has not been minted at the displayed block.`,
        );
      setSelected(id);
    } catch (err) {
      setSelected(null);
      setError(errorText(err));
    }
  }
  return (
    <>
      <Heading title="BMC Illuminati Pass">
        Authentic artwork, attributes and Ethereum ownership.
      </Heading>
      <CollectionStats data={q.data} />
      <Stamp
        data={q.data}
        error={q.error}
        loading={q.isFetching}
        onRefresh={() => void q.refetch()}
      />
      <div className="collection-tools">
        <div className="segmented" aria-label="Filter collection">
          {[
            ["all", "All minted"],
            ["mine", "My NFTs"],
            ["genesis", "Early Genesis"],
            ["mystery", "Mystery"],
          ].map(([v, label]) => (
            <button
              key={v}
              aria-pressed={filter === v}
              onClick={() => {
                setFilter(v);
                setSelected(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={find} className="lookup">
          <label htmlFor="token-id">Look up a token ID</label>
          <div className="row">
            <input
              id="token-id"
              inputMode="numeric"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              placeholder="1–500"
              aria-invalid={!!error}
              aria-describedby="lookup-error"
            />
            <button className="btn btn-secondary">Find Pass</button>
          </div>
          <p id="lookup-error" role="status" className="error">
            {error}
          </p>
        </form>
      </div>
      {selected ? (
        <>
          <button
            className="btn btn-secondary"
            onClick={() => setSelected(null)}
          >
            Return to collection
          </button>
          <NFTCard id={selected} expanded />
        </>
      ) : filter === "mine" && !address ? (
        <Notice title="Find your Passes">
          <p>
            Connect your Ethereum wallet using the header. Ownership is checked
            for every minted token, including transferred NFTs.
          </p>
        </Notice>
      ) : filter === "mine" && w.isPending ? (
        <p role="status">Checking wallet ownership…</p>
      ) : filter === "mine" && w.isError ? (
        <Notice title="Ownership could not be loaded">
          <p>{errorText(w.error)}</p>
          <button
            className="btn btn-secondary"
            onClick={() => void w.refetch()}
          >
            Retry ownership
          </button>
        </Notice>
      ) : ids.length ? (
        <>
          <div className={ids.length === 1 ? "" : "nft-grid"}>
            {ids.slice(page * 12, page * 12 + 12).map((id) => (
              <NFTCard key={id} id={id} expanded={ids.length === 1} />
            ))}
          </div>
          {ids.length > 12 && (
            <div className="row">
              <button
                className="btn btn-secondary"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {Math.ceil(ids.length / 12)}
              </span>
              <button
                className="btn btn-secondary"
                disabled={(page + 1) * 12 >= ids.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <Notice
          title={
            filter === "mine"
              ? "No Passes owned at this block"
              : "No minted Passes in this view"
          }
        >
          <p>
            {filter === "mystery"
              ? "Mystery begins after Genesis #40."
              : "Explore the collection or check another wallet."}
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => setFilter("all")}
          >
            View all minted Passes
          </button>
        </Notice>
      )}
      <ArtworkArchive />
      <Section title="The collection">
        <div className="grid grid-3">
          <Stat
            label="First 40 mints"
            value="1,000,000 BMC"
            note="#1 Legendary, #2–40 Early Genesis"
          />
          <Stat
            label="460 Mystery mints"
            value="350,000 BMC"
            note="37 Random Genesis and 423 Standard outcomes"
          />
          <Stat
            label="Maximum mint burn"
            value="201,000,000 BMC"
            note="Only reached if all 500 Passes are minted"
          />
        </div>
        <a className="btn btn-primary" href={routeHref("mint")}>
          Review minting
        </a>
      </Section>
    </>
  );
}
function Activity({ wallet = false }: { wallet?: boolean }) {
  const { address } = useConnection();
  const q = useActivity(wallet ? address : undefined);
  const [page, setPage] = useState(0);
  if (wallet && !address)
    return <p>Connect your wallet to read recent BMC and Pass transfers.</p>;
  return (
    <div className="stack">
      <p className="muted small">
        {q.data
          ? `Ethereum blocks ${q.data.from}–${q.data.to}. ${q.data.items.length} matching events.`
          : "Reads the latest 5,000 Ethereum blocks."}{" "}
        {wallet
          ? "This covers BMC and Pass transfers, not every wallet transaction."
          : "Only transfers to the zero address count as burns."}
      </p>
      {q.isPending ? (
        <p role="status">Reading blockchain events…</p>
      ) : q.isError ? (
        <>
          <p className="error">Activity is unavailable. {errorText(q.error)}</p>
          <button
            className="btn btn-secondary"
            onClick={() => void q.refetch()}
          >
            Retry activity
          </button>
        </>
      ) : !q.data?.items.length ? (
        <p>No matching events were found in this block window.</p>
      ) : (
        <>
          <ul className="activity-list">
            {q.data.items.slice(page * 10, page * 10 + 10).map((r) => (
              <li key={`${r.hash}:${r.logIndex}`}>
                <div>
                  <strong>{r.kind}</strong>
                  <p>
                    {r.tokenId
                      ? `Pass #${r.tokenId}`
                      : `${amount(r.amount)} BMC`}
                  </p>
                </div>
                <div>
                  <External href={explorer(r.hash, "tx")}>
                    View transaction
                  </External>
                  <p className="small muted">Block {String(r.block)}</p>
                </div>
              </li>
            ))}
          </ul>
          {q.data.items.length > 10 && (
            <div className="row">
              <button
                className="btn btn-secondary"
                disabled={!page}
                onClick={() => setPage(page - 1)}
              >
                Previous events
              </button>
              <span>Page {page + 1}</span>
              <button
                className="btn btn-secondary"
                disabled={(page + 1) * 10 >= q.data.items.length}
                onClick={() => setPage(page + 1)}
              >
                Next events
              </button>
            </div>
          )}
          <p className="small muted">
            Read at{" "}
            {new Date(q.data.timestamp * 1000)
              .toISOString()
              .replace("T", " ")
              .slice(0, 19)}{" "}
            UTC
          </p>
        </>
      )}
    </div>
  );
}
function Dashboard() {
  const { address, chainId } = useConnection();
  const w = useWalletData();
  const c = useCollection();
  const [showActivity, setShowActivity] = useState(false);
  const client = useQueryClient();
  useEffect(() => setShowActivity(false), [address]);
  return (
    <>
      <Heading title="Your BMC dashboard">
        Your balances, Passes and verified activity in one place.
      </Heading>
      {!address ? (
        <Notice title="Connect to see your wallet">
          <p>
            Use Connect in the header. Reading your assets does not require a
            signature or token approval.
          </p>
        </Notice>
      ) : (
        <>
          <div className="row between">
            <div>
              <p className="address">{address}</p>
              <p className="small muted">
                {chainId === 1
                  ? "Connected to Ethereum Mainnet"
                  : `Wallet is on chain ${chainId}. Balances below are read on Ethereum.`}
              </p>
            </div>
            <External href={explorer(address)}>View wallet</External>
          </div>
          {w.isError && (
            <Notice title="Wallet data could not refresh">
              <p>{errorText(w.error)}</p>
              <button
                className="btn btn-secondary"
                onClick={() => void w.refetch()}
              >
                Retry wallet data
              </button>
            </Notice>
          )}
          <div className="stats-grid">
            <Stat
              label="ETH balance"
              value={
                w.data
                  ? amount(w.data.eth, 18, 6)
                  : w.isPending
                    ? "Loading…"
                    : "Unavailable"
              }
            />
            <Stat
              label="BMC balance"
              value={
                w.data
                  ? amount(w.data.bmc)
                  : w.isPending
                    ? "Loading…"
                    : "Unavailable"
              }
            />
            <Stat
              label="Passes owned"
              value={
                w.data
                  ? w.data.ids.length
                  : w.isPending
                    ? "Loading…"
                    : "Unavailable"
              }
            />
            <Stat label="Network" value="Ethereum" />
          </div>
          {w.data && (
            <Stamp
              data={w.data}
              loading={w.isFetching}
              onRefresh={() =>
                void client.invalidateQueries({
                  queryKey: ["wallet", address, PASS],
                })
              }
            />
          )}
        </>
      )}
      <div className="grid grid-3">
        <Stat
          label="BMC staked"
          value="Not available"
          note="No verified staking deployment"
        />
        <Stat
          label="Claimable BMC rewards"
          value="Not available"
          note="No verified funded program"
        />
        <Stat
          label="IMD burned"
          value="Not verified"
          note="No authenticated IMD burn contract"
        />
      </div>
      <Section title="Collection and token burns">
        <p className="muted">
          These are project totals, not your personal burns.
        </p>
        <div className="grid grid-2">
          <Stat
            label="BMC burned by all NFT mints"
            value={amount(c.data.burned)}
          />
          <Stat
            label="BMC burned across the token"
            value={amount(c.data.tokenBurned)}
          />
        </div>
        <Stamp data={c.data} error={c.error} />
        <a href={routeHref("burns")}>Explore burn transactions</a>
      </Section>
      <Section title="My NFTs">
        {!address ? (
          <p>Connect your wallet to discover all your Passes.</p>
        ) : w.isPending ? (
          <p role="status">Checking ownership of all minted Passes…</p>
        ) : w.isError ? (
          <p className="error">
            NFT discovery is unavailable. Retry wallet data above.
          </p>
        ) : !w.data?.ids.length ? (
          <p>
            No BMC Illuminati Passes belong to this wallet at the displayed
            block. <a href={routeHref("pass")}>Explore the collection.</a>
          </p>
        ) : (
          <div className="nft-grid">
            {w.data.ids.map((id) => (
              <NFTCard key={id} id={id} />
            ))}
          </div>
        )}
      </Section>
      <Utility />
      <Transactions />
      <Section title="Recent blockchain activity">
        <button
          className="btn btn-secondary"
          disabled={!address}
          onClick={() => setShowActivity(!showActivity)}
        >
          {showActivity ? "Hide blockchain activity" : "Load recent transfers"}
        </button>
        {showActivity && <Activity wallet key={address} />}
      </Section>
    </>
  );
}
function Staking() {
  const w = useWalletData();
  const { address } = useConnection();
  const [input, setInput] = useState("");
  const [tab, setTab] = useState("BMC");
  return (
    <>
      <Heading title="BMC staking">
        Review the proposed staking program and your available BMC.
      </Heading>
      <Notice title="Deposits are disabled" tone="notice-warn">
        <p>
          No genuine deployed staking address was found in the official records.
          The linked repository is source-only and has not completed independent
          review.
        </p>
        <External href={LINKS.staking}>Inspect the staking repository</External>
      </Notice>
      <div className="staking-layout">
        <section className="stack">
          <h2>Stake BMC</h2>
          <div className="segmented" aria-label="Staking program">
            {["BMC", "NFT", "Combined"].map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <p>
            {tab === "BMC"
              ? "BMC would be staked as principal, with rewards paid from a separate funded balance."
              : tab === "NFT"
                ? "The proposed NFT staking program uses custody. No NFT approval or transfer is enabled."
                : "The proposal combines BMC principal and NFT weights. Bonus weights are not promised yields."}
          </p>
          <label className="field">
            BMC amount
            <input
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0.00"
              disabled={tab === "NFT"}
            />
          </label>
          <p className="small muted">
            Available:{" "}
            {address
              ? w.data
                ? `${amount(w.data.bmc)} BMC`
                : w.isPending
                  ? "Loading…"
                  : "Unavailable"
              : "Connect wallet to read balance"}
          </p>
          <div className="row">
            <button className="btn btn-primary" disabled>
              Stake BMC
            </button>
            <button className="btn btn-secondary" disabled>
              Unstake BMC
            </button>
            <button className="btn btn-secondary" disabled>
              Claim rewards
            </button>
          </div>
          <p className="small muted">
            No approval, deposit, withdrawal or claim can be sent from this
            page.
          </p>
        </section>
        <section className="stack">
          <h2>My staking</h2>
          <dl className="kv">
            <div>
              <dt>Staked BMC</dt>
              <dd>Unavailable</dd>
            </div>
            <div>
              <dt>Available rewards</dt>
              <dd>Unavailable</dd>
            </div>
            <div>
              <dt>Lock duration</dt>
              <dd>Not verified on-chain</dd>
            </div>
            <div>
              <dt>APR / APY</dt>
              <dd>No verified rate</dd>
            </div>
            <div>
              <dt>Funding</dt>
              <dd>No verified reward balance</dd>
            </div>
          </dl>
          <p className="muted">
            A missing deployment is not a zero balance. Only a verified contract
            can establish a position.
          </p>
        </section>
      </div>
      <Section title="Before staking opens">
        <ol className="steps">
          <li>
            Identify the deployed contract and match its runtime, constructor
            values and treasury.
          </li>
          <li>
            Review permissions, withdrawal paths, lock rules and reward
            conservation independently.
          </li>
          <li>
            Confirm actual BMC funding and ensure principal cannot fund rewards.
          </li>
          <li>
            Test the deployed NFT integration. The current collection’s reveal
            API differs from the original proposed staking interface.
          </li>
          <li>
            Publish verified terms and obtain launch authorization before
            enabling deposits.
          </li>
        </ol>
      </Section>
      <Section title="Original staking proposal">
        <p className="muted">
          Source design only. These are not active entitlements or current
          deployment terms.
        </p>
        <div className="grid grid-4">
          <Stat label="BMC staking budget" value="55%" />
          <Stat label="NFT staking budget" value="25%" />
          <Stat label="Combined budget" value="15%" />
          <Stat label="Reserve" value="5%" />
        </div>
        <p>
          The source proposes a fully prefunded 365-day program, configurable
          before activation. A one-block withdrawal rule is not a time lock
          measured in days. Rewards depend on actual funding, elapsed time and
          every participant’s weight.
        </p>
        <p>
          The proposed NFT weights are 5× Legendary Genesis, 3× Early Genesis,
          2× Random Genesis and 1× Standard. A weight multiplier is not an APR.
        </p>
      </Section>
      <Section title="Staking transaction history">
        <p>
          Unavailable until a verified staking deployment is configured. View
          your actual BMC transfers in the dashboard.
        </p>
        <a className="btn btn-secondary" href={routeHref("dashboard")}>
          Open dashboard
        </a>
      </Section>
    </>
  );
}
function Burns() {
  const q = useCollection();
  const [activity, setActivity] = useState(false);
  return (
    <>
      <Heading title="Burns, verified on Ethereum">
        A burn reduces BMC’s total supply. Every figure has an on-chain source.
      </Heading>
      <div className="stats-grid">
        <Stat
          label="Initial BMC supply"
          value={amount(q.data.initialSupply, 18, 0)}
        />
        <Stat label="Current BMC supply" value={amount(q.data.tokenSupply)} />
        <Stat label="Total BMC burned" value={amount(q.data.tokenBurned)} />
        <Stat
          label="Burned through NFT minting"
          value={amount(q.data.burned)}
        />
      </div>
      <Stamp
        data={q.data}
        error={q.error}
        loading={q.isFetching}
        onRefresh={() => void q.refetch()}
      />
      <p className="small muted">
        Total burned = INITIAL_SUPPLY() − totalSupply(). NFT mint burns are a
        subset, not an additional amount. Supply and amounts use 18 decimals.
      </p>
      <Section title="Genesis #1 mint and burn">
        <p>
          The first mint receipt contains both the NFT Transfer event and an
          exact 1,000,000 BMC transfer to the zero address.
        </p>
        <External href={explorer(sourceSnapshot.genesis.mintTransaction, "tx")}>
          Inspect Genesis #1 mint receipt
        </External>
      </Section>
      <Section title="Recent burn transactions">
        <button
          className="btn btn-secondary"
          onClick={() => setActivity(!activity)}
        >
          {activity ? "Hide live burn history" : "Load recent burn history"}
        </button>
        {activity ? (
          <Activity />
        ) : (
          <ul className="activity-list">
            {sourceSnapshot.burns
              .slice(-5)
              .reverse()
              .map((b) => (
                <li key={`${b.hash}:${b.logIndex}`}>
                  <div>
                    <strong>{amount(BigInt(b.amount))} BMC burned</strong>
                    <p className="small muted">Saved block {b.blockNumber}</p>
                  </div>
                  <External href={explorer(b.hash, "tx")}>View burn</External>
                </li>
              ))}
          </ul>
        )}
      </Section>
      <Section title="IMD burn center">
        <Notice title="IMD burns are not configured">
          <p>
            The authentic IMD token, chain and burn mechanism have not been
            established for this integration. No burn, fee conversion or total
            is invented.
          </p>
        </Notice>
      </Section>
      <Section title="Manual buybacks">
        <p>
          The original ecosystem proposal described operator-funded IMD
          buybacks. No verified buyback records were found in the supplied
          sources. Future records must include the purchase, genuine-token burn
          and transaction links. There is no automatic buyback or guaranteed
          return.
        </p>
      </Section>
      <Section title="BMC token">
        <dl className="kv">
          <div>
            <dt>Contract</dt>
            <dd>
              <External href={explorer(BMC, "token")}>
                <span className="address">{BMC}</span>
              </External>
            </dd>
          </div>
          <div>
            <dt>Network / decimals</dt>
            <dd>Ethereum / 18</dd>
          </div>
          <div>
            <dt>Token permissions</dt>
            <dd>No owner, public mint, pause or proxy in the matched source</dd>
          </div>
        </dl>
        <p>
          The token itself has no transfer fee. Pool and hook fees are separate;
          review the swap page before trading.
        </p>
      </Section>
    </>
  );
}
function Verification() {
  const q = useCollection();
  return (
    <>
      <Heading title="Deployment verification">
        Evidence supports each enabled read. It does not replace an independent
        security review.
      </Heading>
      <Notice title="Official NFT address reconciled">
        <p>
          The task’s address holds Genesis #1. The previous site read a
          different, empty collection. All reads in this release use the
          requested address.
        </p>
      </Notice>
      <dl className="kv">
        <div>
          <dt>Official Pass</dt>
          <dd className="address">
            <External href={explorer(PASS)}>{PASS}</External>
          </dd>
        </div>
        <div>
          <dt>BMC token</dt>
          <dd className="address">
            <External href={explorer(BMC)}>{BMC}</External>
          </dd>
        </div>
        <div>
          <dt>Founder / current contract owner at verification</dt>
          <dd className="address">
            <External href={explorer(FOUNDER)}>{FOUNDER}</External>
          </dd>
        </div>
      </dl>
      <Stamp data={q.data} error={q.error} />
      <div className="status-table">
        <div>
          <strong>Executable NFT bytecode</strong>
          <span>Matches compiled source after separating CBOR metadata</span>
        </div>
        <div>
          <strong>Genesis #1 ownership and metadata</strong>
          <span>Read from ownerOf(1) and tokenURI(1)</span>
        </div>
        <div>
          <strong>Deployed mint / burn</strong>
          <span>Genesis receipt and token burn match</span>
        </div>
        <div>
          <strong>Independent release review</strong>
          <span>Not recorded</span>
        </div>
        <div>
          <strong>NFT explorer source verification</strong>
          <span>Not confirmed</span>
        </div>
      </div>
      <Section title="Mint release gate">
        <ul>
          {releaseBlockers().map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p>
          The gate is checked in the transaction service as well as the
          interface. This release never calls openMinting().
        </p>
        <External href={LINKS.nftSource}>Read the matched NFT source</External>
      </Section>
      <Section title="Metadata compatibility">
        <p>
          The NFT stores base64-encoded JSON on-chain. Its image is an immutable
          IPFS URL. The official dedicated gateway returned HTTP 403 during
          verification; the public Pinata gateway returned the original PNG. The
          website decodes the JSON and serves a lossless local copy with
          identical image pixels.
        </p>
        <p>
          The deployed NFT was not changed. MetaMask’s own gateway and cache are
          outside the website’s control; fixing this website cannot guarantee
          that MetaMask refreshes its thumbnail.
        </p>
      </Section>
      <Section title="Current limitations">
        <ul>
          <li>
            Mystery uses block-derived randomness that validators can influence.
            Static analysis flags this as weak randomness; it remains an
            unresolved release-review item.
          </li>
          <li>
            No staking address or funded holder claim program is verified.
          </li>
          <li>
            Launchpad execution requires separate contracts, infrastructure
            verification and authorization.
          </li>
          <li>
            External wallets, RPCs and IPFS gateways can be unavailable. Stale
            snapshots are labelled.
          </li>
        </ul>
      </Section>
    </>
  );
}
function Community() {
  return (
    <>
      <Heading title="BMC community">Know · Create · Burn · Rise.</Heading>
      <Section title="Official project links">
        <ProjectLinks />
        <div className="row">
          <a href={routeHref("mint")}>NFT Mint</a>
          <a href={routeHref("staking")}>Staking</a>
          <a href={routeHref("launchpad")}>Launchpad plans</a>
        </div>
        <p className="muted">
          Official X/Twitter and Telegram URLs were not confirmed in the project
          files. They remain unlinked until the project owner supplies them.
        </p>
      </Section>
      <Section title="Verified project updates">
        <article className="update">
          <h3>Legendary Genesis #1 has been minted</h3>
          <p>
            The official collection’s first Pass is visible with its authentic
            image, attributes and owner. Its successful mint burned 1,000,000
            BMC.
          </p>
          <External
            href={explorer(sourceSnapshot.genesis.mintTransaction, "tx")}
          >
            View the on-chain evidence
          </External>
        </article>
        <article className="update">
          <h3>The website now reads the official collection</h3>
          <p>
            The previous site pointed to a different deployment. The gallery and
            wallet discovery now use the collection supplied by the founder.
          </p>
          <a href={routeHref("verification")}>Read the verification record</a>
        </article>
        <p className="small muted">
          These are evidence-backed development updates, not a social-media feed
          or newly issued founder announcements.
        </p>
      </Section>
      <Section title="Frequently asked questions">
        <details>
          <summary>
            Why does the contract say open while minting is disabled here?
          </summary>
          <p>
            The owner’s on-chain opening and the website’s release review are
            separate. This website keeps the existing PRE_LAUNCH checks until
            explorer source verification, independent review acceptance and the
            existing release checks are recorded.
          </p>
        </details>
        <details>
          <summary>Do Passes guarantee a return or an airdrop?</summary>
          <p>
            No. Proposed benefits depend on verified and funded programs. No
            holder allocation or yield is promised.
          </p>
        </details>
        <details>
          <summary>How do I prove NFT ownership?</summary>
          <p>
            Read ownership from Ethereum. Connecting never requires an NFT
            transfer, NFT approval, seed phrase or private key. A future
            cross-chain claim will need a reviewed claim contract and verified
            ownership snapshot.
          </p>
        </details>
      </Section>
    </>
  );
}
export function App() {
  const initial = () =>
    location.hash.replace(/^#\/?/, "").split("?")[0] ||
    (document.getElementById("root")?.dataset.entry === "mint" ? "mint" : "");
  const [route, setRoute] = useState(initial);
  const [menu, setMenu] = useState(false);
  const [motion, setMotion] = useState(() => {
    try {
      return localStorage.getItem("bmc:motion") !== "off";
    } catch {
      return false;
    }
  });
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    const onHash = () => {
      setRoute(initial());
      setMenu(false);
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    document.title = route
      ? `${routes.find((r) => r[0] === route)?.[1] || "BMC"} · BMC Illuminati`
      : "BMC Illuminati — Know · Create · Burn · Rise";
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route]);
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
    try {
      localStorage.setItem("bmc:motion", motion ? "on" : "off");
    } catch {}
  }, [motion]);
  const pages: Record<string, ReactNode> = {
    "": <Home />,
    mint: <Mint />,
    pass: <Collection />,
    dashboard: <Dashboard />,
    staking: <Staking />,
    swap: <Swap />,
    burns: <Burns />,
    launchpad: <Launchpad />,
    community: <Community />,
    verification: <Verification />,
    rewards: (
      <>
        <Heading title="Pass holder benefits" />
        <Utility />
      </>
    ),
  };
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="header">
        <div className="container header-inner">
          <a className="brand" href={routeHref("")}>
            <Emblem animated />
            <span>BMC Illuminati</span>
          </a>
          <nav className="nav-desktop" aria-label="Main navigation">
            <ul>
              {routes
                .filter((r) => r[0] && r[0] !== "burns" && r[0] !== "pass")
                .map(([r, label]) => (
                  <li key={r}>
                    <a
                      className="nav-link"
                      href={routeHref(r)}
                      aria-current={route === r ? "page" : undefined}
                    >
                      {label}
                    </a>
                  </li>
                ))}
            </ul>
          </nav>
          <div className="header-actions">
            <ConnectControl />
            <button
              className="icon-btn nav-toggle"
              aria-label={menu ? "Close navigation" : "Open navigation"}
              aria-expanded={menu}
              aria-controls="mobile-nav"
              onClick={() => setMenu(!menu)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d={menu ? "M5 5l14 14M19 5 5 19" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>
        {menu && (
          <nav
            id="mobile-nav"
            className="container nav-mobile"
            aria-label="Mobile navigation"
          >
            <ul>
              {routes.map(([r, label]) => (
                <li key={r}>
                  <a
                    className="nav-link"
                    href={routeHref(r)}
                    aria-current={route === r ? "page" : undefined}
                    onClick={() => setMenu(false)}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <ProjectLinks />
          </nav>
        )}
        <nav
          className="desktop-project-links container"
          aria-label="Official project links"
        >
          <ProjectLinks />
        </nav>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        ref={main}
        className="container page"
        key={route}
      >
        {pages[route] || (
          <>
            <Heading title="Page not found" />
            <a className="btn btn-primary" href={routeHref("")}>
              Return to BMC Illuminati
            </a>
          </>
        )}
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <div className="stack">
            <a className="brand" href={routeHref("")}>
              <Emblem />
              <span>BMC Illuminati</span>
            </a>
            <p>Know · Create · Burn · Rise</p>
            <ProjectLinks />
          </div>
          <div className="footer-nav">
            <a href={routeHref("mint")}>NFT Mint</a>
            <a href={routeHref("staking")}>Staking</a>
            <a href={routeHref("launchpad")}>Launchpad plans</a>
            <a href={routeHref("verification")}>Verification</a>
            <button
              className="text-button"
              aria-pressed={!motion}
              onClick={() => setMotion(!motion)}
            >
              {motion ? "Pause decorative motion" : "Resume decorative motion"}
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
