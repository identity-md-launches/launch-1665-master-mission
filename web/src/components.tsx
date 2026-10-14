import { useState, type ReactNode } from "react";
import { asset, CID, explorer, nftExplorer, PASS } from "./config";
import { imageCandidates, type Metadata } from "./metadata";
import {
  useNFT,
  amount,
  errorText,
  type CollectionData,
  type NFT,
} from "./data";
export function External({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <span className="external-icon" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}
export function Emblem({ animated = false }: { animated?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`emblem ${animated ? "emblem-animated" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M60 10 L110 100 H10 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M60 32 L92 90 H28 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity=".5"
      />
      <ellipse
        cx="60"
        cy="70"
        rx="22"
        ry="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle className="eye-pupil" cx="60" cy="70" r="7" fill="currentColor" />
      <circle cx="63" cy="67" r="2" fill="#fff" />
    </svg>
  );
}
export function Heading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="section-head">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
export function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function Notice({
  title,
  children,
  tone = "",
}: {
  title: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`notice ${tone}`}>
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  );
}
export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}
export function Stamp({
  data,
  loading = false,
  onRefresh,
  error,
}: {
  data: { block: bigint; timestamp: number; mode?: string };
  loading?: boolean;
  onRefresh?: () => void;
  error?: unknown;
}) {
  return (
    <div className="data-stamp">
      <div>
        <span className="data-kind">
          {data.mode === "snapshot"
            ? "Saved on-chain snapshot"
            : "Ethereum read"}
        </span>
        <span>
          {" "}
          ·{" "}
          <External href={explorer(String(data.block), "block")}>
            Block {String(data.block)}
          </External>
        </span>
        <br />
        <time dateTime={new Date(data.timestamp * 1000).toISOString()}>
          {new Date(data.timestamp * 1000).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          })}{" "}
          UTC
        </time>
        {!!error && (
          <p className="error">
            Live refresh unavailable. Showing the timestamped snapshot.
          </p>
        )}
      </div>
      {onRefresh && (
        <button
          className="btn btn-secondary btn-sm"
          disabled={loading}
          onClick={onRefresh}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      )}
    </div>
  );
}
export function NFTImage({
  metadata,
  priority = false,
}: {
  metadata: Metadata;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(0);
  const exact = metadata.image === `ipfs://${CID}/genesis-01.png`;
  const urls = exact
    ? [asset("artwork/genesis-01.webp"), ...imageCandidates(metadata.image)]
    : imageCandidates(metadata.image);
  return failed < urls.length ? (
    <img
      className="nft-image"
      src={urls[failed]}
      alt={metadata.name}
      width="1024"
      height="1024"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(failed + 1)}
    />
  ) : (
    <div className="art-error">
      <p>Artwork could not load from the IPFS gateways.</p>
      <button className="btn btn-secondary" onClick={() => setFailed(0)}>
        Retry artwork
      </button>
    </div>
  );
}
export function NFTCard({
  id,
  expanded = false,
}: {
  id: number;
  expanded?: boolean;
}) {
  const q = useNFT(id);
  const [details, setDetails] = useState(expanded);
  const n = q.data;
  if (!n)
    return (
      <article className="nft-card">
        <h3>Pass #{id}</h3>
        <p role="status">
          {q.isPending ? "Reading NFT metadata…" : errorText(q.error)}
        </p>
        {q.isError && (
          <button
            className="btn btn-secondary"
            onClick={() => void q.refetch()}
          >
            Retry NFT
          </button>
        )}
      </article>
    );
  return (
    <article className={`nft-card ${expanded ? "nft-expanded" : ""}`}>
      <NFTImage metadata={n.metadata} />
      <div className="nft-details stack">
        <div className="row between">
          <h3>Pass #{id}</h3>
          <span className="gold">
            {n.metadata.attributes.find((a) => a.trait_type === "Tier")
              ?.value || "Tier unavailable"}
          </span>
        </div>
        <p className="owner-label">
          Owner{" "}
          <External href={explorer(n.owner)}>
            <span className="address">{n.owner}</span>
          </External>
        </p>
        <p className="small muted">
          {n.mode === "snapshot" ? "Snapshot" : "Read"} at block{" "}
          {String(n.block)} ·{" "}
          <time>
            {new Date(n.timestamp * 1000)
              .toISOString()
              .replace("T", " ")
              .slice(0, 16)}{" "}
            UTC
          </time>
          {q.isFetching ? " · refreshing…" : ""}
        </p>
        {!!q.error && (
          <p className="error small">
            Live ownership refresh unavailable. Retry before relying on the
            saved owner.
          </p>
        )}
        {n.status === 1 || n.status === 2 ? (
          <p className="notice">
            Awaiting reveal. Eligible after block {String(n.revealBlock)};
            deadline {String(n.deadline)}.
          </p>
        ) : null}
        <div className="row">
          <button
            className="btn btn-secondary"
            aria-expanded={details}
            onClick={() => setDetails(!details)}
          >
            {details ? "Hide attributes" : "View attributes"}
          </button>
          <External href={nftExplorer(id)}>View on Etherscan</External>
        </div>
        {details && (
          <>
            <p>{n.metadata.description}</p>
            <dl className="attributes">
              {n.metadata.attributes.map((a, i) => (
                <div key={i}>
                  <dt>{a.trait_type}</dt>
                  <dd>{a.value}</dd>
                </div>
              ))}
            </dl>
            <details>
              <summary>Metadata and artwork source</summary>
              <p className="address">Collection: {PASS}</p>
              <p className="address">
                {n.metadata.image.startsWith("ipfs:")
                  ? n.metadata.image
                  : "SVG artwork stored in the NFT contract"}
              </p>
              {n.metadata.image.startsWith("ipfs:") && (
                <External href={imageCandidates(n.metadata.image)[0]}>
                  Open original IPFS artwork
                </External>
              )}
            </details>
          </>
        )}
      </div>
    </article>
  );
}
export function CollectionStats({ data }: { data: CollectionData }) {
  return (
    <div className="stats-grid">
      <Stat label="Passes minted" value={`${data.minted} / 500`} />
      <Stat
        label="Remaining Genesis"
        value={`${Math.max(40 - data.minted, 0)} / 40`}
      />
      <Stat label="BMC burned by minting" value={amount(data.burned, 18, 0)} />
      <Stat label="Pending reveals" value={data.pending} />
    </div>
  );
}
