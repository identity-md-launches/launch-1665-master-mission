import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  useConnection,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
  type Connector,
} from "wagmi";
import { getAddress } from "viem";
import { shortAddress } from "./config";
import { errorText } from "./data";
import { walletIcons } from "./wallet-icons";
export const OPEN_IN = [
  {
    id: "metamask",
    name: "MetaMask",
    href: (u: string) =>
      `https://link.metamask.io/dapp/${u.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    href: (u: string) =>
      `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(u)}`,
  },
  {
    id: "phantom",
    name: "Phantom",
    href: (u: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(new URL(u).origin)}`,
  },
];
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="wallet-dialog"
      onKeyDown={(e) => {
        if (e.key !== "Tab" || !ref.current) return;
        const items = Array.from(
          ref.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]',
          ),
        ).filter((el) => el.getClientRects().length > 0);
        if (!items.length) {
          e.preventDefault();
          ref.current.focus();
          return;
        }
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-label={title}
    >
      <div className="sheet-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ConnectControl() {
  const { address, isConnected, chainId } = useConnection();
  const connectors = useConnectors();
  const { mutateAsync: connect, isPending, variables } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutateAsync: switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !("ethereum" in window);
  const named = connectors.some(
    (c) => c.type === "injected" && c.id !== "injected",
  );
  const listed = [
    ...connectors.filter((c) => c.type === "injected"),
    ...connectors.filter((c) => c.type !== "injected"),
  ].filter(
    (c) =>
      !(c.id === "injected" && named) && !(mobile && c.type === "injected"),
  );
  const label = (c: Connector) =>
    c.id === "injected"
      ? "Browser wallet"
      : c.id === "coinbaseWalletSDK"
        ? mobile
          ? "Coinbase Smart Wallet"
          : "Coinbase Wallet"
        : c.name;
  useEffect(() => {
    if (isConnected) setOpen(false);
  }, [isConnected]);
  async function choose(c: Connector) {
    setMessage("");
    try {
      await connect({ connector: c, chainId: 1 });
    } catch (e) {
      setMessage(errorText(e));
    }
  }
  async function changeChain() {
    setMessage("");
    try {
      await switchChain({ chainId: 1 });
    } catch (e) {
      setMessage(errorText(e));
      setOpen(true);
    }
  }
  return (
    <>
      <button
        className="btn btn-secondary wallet-control"
        onClick={() =>
          isConnected && chainId !== 1 ? void changeChain() : setOpen(true)
        }
      >
        {switching
          ? "Switching…"
          : isConnected && chainId !== 1
            ? "Switch to Ethereum"
            : address
              ? shortAddress(getAddress(address))
              : "Connect"}
      </button>
      {open && (
        <Dialog
          title={address ? "Your wallet" : "Connect a wallet"}
          onClose={() => setOpen(false)}
        >
          {address ? (
            <div className="stack">
              <p className="address">{getAddress(address)}</p>
              <p>
                {chainId === 1
                  ? "Ethereum Mainnet"
                  : `Connected chain ${chainId}. Switch to Ethereum before transacting.`}
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                Disconnect
              </button>
              <p className="muted">
                Disconnecting does not revoke token allowances.
              </p>
            </div>
          ) : (
            <>
              <p className="muted">
                Connect to view your balances and Passes. Connection does not
                authorize a transaction.
              </p>
              <div className="wallet-list">
                {mobile &&
                  OPEN_IN.map((w) => (
                    <a
                      className="wallet-row"
                      href={w.href(location.href)}
                      key={w.id}
                    >
                      <img src={walletIcons[w.id]} alt="" />
                      <span>Open in {w.name}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                {listed.map((c) => (
                  <button
                    className="wallet-row"
                    key={c.uid}
                    disabled={isPending}
                    onClick={() => void choose(c)}
                  >
                    <img
                      alt=""
                      src={c.icon || walletIcons[c.id] || walletIcons.browser}
                    />
                    <span>
                      {label(c)}
                      {isPending && variables?.connector === c
                        ? " · opening…"
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          <p role="status" className="error">
            {message}
          </p>
        </Dialog>
      )}
    </>
  );
}
