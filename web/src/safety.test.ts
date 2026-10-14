import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeFunctionData,
  encodeFunctionData,
  getAddress,
  type Address,
  type WalletClient,
} from "viem";
import {
  decodeMetadata,
  imageCandidates,
  tokenIdInput,
  safeURL,
} from "./metadata";
import { minReceived } from "./Swap";
import { feeAllocation, snapshotLeaf, validateDraft } from "./Launchpad";
import { amount, discoverOwned } from "./data";
import {
  assertReleased,
  prepareAction,
  submitAction,
  validateSession,
  loadTransactions,
  unresolved,
} from "./transactions";
import {
  RELEASE,
  releaseBlockers,
  PASS,
  BMC,
  GENESIS_PRICE,
  MYSTERY_PRICE,
  passAbi,
  bmcAbi,
  CID,
  FOUNDER,
  publicClient,
  sourceSnapshot,
} from "./config";
const metadata = (v: unknown) =>
  "data:application/json;base64," +
  Buffer.from(JSON.stringify(v)).toString("base64");
const real = decodeMetadata(sourceSnapshot.genesis.tokenURI);
test("official metadata decodes authentic image, Legendary tier and all attributes", () => {
  assert.equal(real.image, `ipfs://${CID}/genesis-01.png`);
  assert.equal(
    real.attributes.find((a) => a.trait_type === "Tier")?.value,
    "Legendary Genesis",
  );
  assert.equal(real.attributes.length, 9);
  assert(real.name.includes("#1"));
});
test("both JSON data encodings preserve Unicode and renderable text", () => {
  const m = {
    name: "Pass Ω <script>alert(1)</script>",
    description: "<b>data only</b>",
    image: real.image,
    attributes: [],
  };
  assert.equal(decodeMetadata(metadata(m)).name, m.name);
  assert.equal(
    decodeMetadata(
      "data:application/json," + encodeURIComponent(JSON.stringify(m)),
    ).description,
    m.description,
  );
});
test("metadata rejects untrusted schemes, CIDs, missing fields and oversized input", () => {
  for (const image of [
    "javascript:alert(1)",
    "https://attacker.example/a.svg",
    "ipfs://othercid/a.png",
    `ipfs://${CID}/../../bad.png`,
  ])
    assert.throws(() => decodeMetadata(metadata({ ...real, image })));
  assert.throws(() => decodeMetadata(metadata({ name: "missing image" })));
  assert.throws(() => decodeMetadata("x".repeat(250001)));
  assert.throws(() => decodeMetadata("data:application/json;base64,%%%%"));
});
test("all Genesis gateways preserve the immutable directory and filename", () => {
  for (let n = 1; n <= 77; n++) {
    const f = `genesis-${String(n).padStart(2, "0")}.png`;
    assert(
      imageCandidates(`ipfs://${CID}/${f}`).every((x) =>
        x.endsWith(`/ipfs/${CID}/${f}`),
      ),
    );
  }
  assert.throws(() => imageCandidates(`ipfs://${CID}/genesis-78.png`));
});
test("token lookup rejects ambiguous, fractional and out-of-range IDs", () => {
  for (const v of ["", "0", "501", "1.0", "1e2", "01", "-1", "<script>"])
    assert.throws(() => tokenIdInput(v));
  assert.equal(tokenIdInput("500"), 500);
});
test("social and metadata URL fields reject insecure protocols and credentials", () => {
  for (const url of [
    "http://example.com",
    "javascript:alert(1)",
    "https://user:pass@example.com",
    "file:///tmp/x",
  ])
    assert.throws(() => safeURL(url));
  assert.equal(safeURL("https://example.com"), "https://example.com/");
  assert.equal(safeURL(""), undefined);
});
test("BMC formatting retains large integer precision", () => {
  assert.equal(amount(984742728905864527113784752n), "984,742,728.9058");
  assert.equal(amount(1000000000000000000000000n), "1,000,000");
  assert.equal(amount(1n, 18, 18), "0.000000000000000001");
  assert.equal(amount(undefined), "Unavailable");
});
test("production release blocks even when on-chain minting is open", () => {
  assert(sourceSnapshot.pass.mintingOpen);
  assert(releaseBlockers().length >= 3);
  assert.throws(() => assertReleased(), /PRE_LAUNCH/);
});
test("each independent release requirement fails closed", () => {
  const complete = {
    ...RELEASE,
    mode: "LIVE" as const,
    explorerSourceVerified: true,
    independentReviewAccepted: true,
    publicMintAuthorization: "test-only-authorization",
  };
  assert.equal(releaseBlockers(complete).length, 0);
  for (const key of [
    "addressReconciled",
    "executableMatch",
    "explorerSourceVerified",
    "independentReviewAccepted",
    "deployedMintAndBurnValidated",
  ] as const)
    assert.throws(() => assertReleased({ ...complete, [key]: false }));
  assert.throws(() =>
    assertReleased({ ...complete, publicMintAuthorization: "  " }),
  );
});
test("prepare and submission guard rejects before touching wallet or RPC", async () => {
  let called = false;
  const wallet = new Proxy(
    {},
    {
      get() {
        called = true;
        throw new Error("Unexpected wallet access");
      },
    },
  ) as WalletClient;
  await assert.rejects(
    () => prepareAction("genesis", FOUNDER, wallet),
    /Transactions are locked/,
  );
  await assert.rejects(
    () => submitAction({} as never, wallet),
    /Transactions are locked/,
  );
  assert.equal(called, false);
});
test("session validation rejects changed account and wrong chain", async () => {
  await assert.rejects(
    () =>
      validateSession(
        {
          getChainId: async () => 10,
          getAddresses: async () => [FOUNDER],
        } as unknown as WalletClient,
        FOUNDER,
      ),
    /Ethereum/,
  );
  await assert.rejects(
    () =>
      validateSession(
        {
          getChainId: async () => 1,
          getAddresses: async () => [BMC],
        } as unknown as WalletClient,
        FOUNDER,
      ),
    /account changed/,
  );
  await validateSession(
    {
      getChainId: async () => 1,
      getAddresses: async () => [FOUNDER],
    } as unknown as WalletClient,
    FOUNDER,
  );
});
test("calldata targets exact Genesis or Mystery allowances and correct selectors", () => {
  for (const price of [GENESIS_PRICE, MYSTERY_PRICE]) {
    const data = encodeFunctionData({
      abi: bmcAbi,
      functionName: "approve",
      args: [PASS, price],
    });
    const decoded = decodeFunctionData({ abi: bmcAbi, data });
    assert.equal(decoded.functionName, "approve");
    assert.deepEqual(decoded.args, [PASS, price]);
    assert(price < 2n ** 256n - 1n);
  }
  assert.equal(
    encodeFunctionData({ abi: passAbi, functionName: "mintGenesis" }).length,
    10,
  );
  assert.equal(
    decodeFunctionData({
      abi: passAbi,
      data: encodeFunctionData({
        abi: passAbi,
        functionName: "reveal",
        args: [50n],
      }),
    }).functionName,
    "reveal",
  );
});
test("slippage uses integer floors and rejects unsafe tolerances", () => {
  assert.equal(minReceived(123456789n, 50), 122839505n);
  for (const v of [-1, 0, 0.5, 501, NaN])
    assert.throws(() => minReceived(100n, v));
});
test("proposed fee splits conserve every wei across rounding boundaries", () => {
  for (let n = 0n; n < 10000n; n++) {
    const r = feeAllocation(n * 123456789n);
    assert.equal(r.creator + r.imd + r.bmc, r.fee);
    assert.equal(r.fee, (n * 123456789n) / 100n);
  }
  assert.throws(() => feeAllocation(-1n));
});
test("token drafts cannot imply a deployment or funding and validate identity", () => {
  const d = {
    name: "Example",
    ticker: "EX",
    description: "Draft",
    website: "https://example.com",
    x: "",
    telegram: "",
    discord: "",
    holderAllocation: true,
  };
  const out = validateDraft(d);
  assert.equal(out.status, "LOCAL_DRAFT_NOT_DEPLOYED");
  assert.equal(out.chain, null);
  assert.equal(out.factory, null);
  assert.equal(out.holderClaims?.funded, false);
  assert.equal(out.holderClaims?.claimContract, null);
  assert.throws(() => validateDraft({ ...d, ticker: "!BAD" }));
  assert.throws(() => validateDraft({ ...d, name: "" }));
});
test("snapshot leaves distinguish token IDs, owners, source blocks and chains", () => {
  const hash = ("0x" + "11".repeat(32)) as `0x${string}`;
  const a = snapshotLeaf(1n, PASS, hash, 1n, FOUNDER);
  assert.notEqual(a, snapshotLeaf(1n, PASS, hash, 2n, FOUNDER));
  assert.notEqual(a, snapshotLeaf(1n, PASS, hash, 1n, BMC));
  assert.notEqual(a, snapshotLeaf(2n, PASS, hash, 1n, FOUNDER));
  assert.notEqual(
    a,
    snapshotLeaf(
      1n,
      PASS,
      ("0x" + "22".repeat(32)) as `0x${string}`,
      1n,
      FOUNDER,
    ),
  );
});
test("persisted pending records are scoped to account, chain and official collection", () => {
  const old = globalThis.localStorage;
  const key = "bmc:transactions:v2:1:" + PASS;
  const good = {
    account: FOUNDER,
    pass: PASS,
    chainId: 1,
    action: "genesis",
    status: "pending",
    createdAt: 1,
    label: "Genesis",
    amount: GENESIS_PRICE.toString(),
    hash: "0x" + "ab".repeat(32),
  };
  globalThis.localStorage = {
    getItem: (k: string) =>
      k === key
        ? JSON.stringify([
            good,
            { ...good, chainId: 10 },
            { ...good, pass: BMC },
            { ...good, account: "bad" },
          ])
        : null,
  } as Storage;
  assert.equal(loadTransactions().length, 1);
  assert.equal(unresolved(FOUNDER), true);
  assert.equal(unresolved(BMC), false);
  globalThis.localStorage = old;
});

test("wallet discovery includes multiple transferred NFTs across every ownership page", async () => {
  const owned = [1, 40, 41, 75, 99];
  const pages: number[][] = [];
  const result = await discoverOwned(100, FOUNDER, 5n, async (ids) => {
    pages.push(ids);
    return ids.map((id) =>
      owned.includes(id) ? (FOUNDER.toLowerCase() as Address) : BMC,
    );
  });
  assert.deepEqual(result, owned);
  assert.equal(pages.length, 2);
  assert.equal(pages.flat().length, 100);
  await assert.rejects(
    () => discoverOwned(2, FOUNDER, 1n, async () => [FOUNDER]),
    /incomplete/,
  );
  await assert.rejects(
    () => discoverOwned(1, FOUNDER, 0n, async () => [FOUNDER]),
    /incomplete/,
  );
  await assert.rejects(
    () => discoverOwned(501, FOUNDER, 0n, async () => []),
    /supply/,
  );
});
