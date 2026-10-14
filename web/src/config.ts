import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import {
  createPublicClient,
  fallback,
  erc20Abi,
  parseAbi,
  getAddress,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";
import snapshot from "./snapshot.json";

export const PASS = getAddress("0x92789d9bb680a2db8617270a530e9d0f80b48641");
export const BMC = getAddress("0x38224239f2bdae357d47cb864bc533d7f72df961");
export const FOUNDER = getAddress("0x83027ad9d0d5374335086c539dadd1db983441b0");
export const CID =
  "bafybeihfihwwpev4gkqjuqawgtptsv3ynzsokclo6odsolvoa65aqaac2u";
export const GENESIS_PRICE = 1_000_000n * 10n ** 18n;
export const MYSTERY_PRICE = 350_000n * 10n ** 18n;
export const PUBLIC_RPC = "https://ethereum-rpc.publicnode.com";
const transport = () =>
  fallback([
    http(PUBLIC_RPC, { timeout: 12000, retryCount: 1 }),
    http("https://eth.drpc.org", { timeout: 12000, retryCount: 1 }),
  ]);
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: transport(),
  batch: { multicall: { wait: 20 } },
});
export const config = createConfig({
  chains: [mainnet],
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "BMC Illuminati",
      preference: { options: "all" },
    }),
  ],
  transports: { 1: transport() },
});
export const passAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function owner() view returns (address)",
  "function BMC() view returns (address)",
  "function mintingOpen() view returns (bool)",
  "function totalMinted() view returns (uint256)",
  "function totalBurned() view returns (uint256)",
  "function remainingSupply() view returns (uint256)",
  "function currentPrice() view returns (uint256)",
  "function pendingReveals() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function GENESIS_PRICE() view returns (uint256)",
  "function MYSTERY_PRICE() view returns (uint256)",
  "function genesisImagesCID() view returns (string)",
  "function nextRevealId() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address account) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function tierOf(uint256 tokenId) view returns (uint8)",
  "function revealStatusOf(uint256 tokenId) view returns (uint8)",
  "function revealBlockOf(uint256 tokenId) view returns (uint256)",
  "function revealDeadlineOf(uint256 tokenId) view returns (uint256)",
  "function mintGenesis() returns (uint256)",
  "function mintMystery() returns (uint256)",
  "function reveal(uint256 maxCount) returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event GenesisMinted(address indexed minter, uint256 indexed tokenId, uint16 artworkId, uint256 bmcBurned)",
  "event MysteryMinted(address indexed minter, uint256 indexed tokenId, uint256 bmcBurned, uint256 revealBlock)",
  "event Revealed(uint256 indexed tokenId, uint8 tier, uint16 artworkId, bool forced)",
]);
export const bmcAbi = [
  ...erc20Abi,
  ...parseAbi(["function INITIAL_SUPPLY() view returns (uint256)"]),
] as const;
export const LINKS = {
  github: "https://github.com/identity-md-launches/launch-1481-bmc-illuminati",
  nftSource:
    "https://github.com/identity-md-launches/launch-1481-bmc-illuminati/blob/9963eea05a4682e423a8f0381ccab4e8b43a832a/src/BMCIlluminatiPass.sol",
  staking: "https://github.com/0xSt3w/launch-1357-project-bmc-illuminati",
  imd: "https://imd.fun",
  x: null as string | null,
  telegram: null as string | null,
};
export const explorer = (
  value: string,
  kind: "address" | "tx" | "block" | "token" = "address",
) => `https://etherscan.io/${kind}/${value}`;
export const nftExplorer = (id: number) =>
  `https://etherscan.io/nft/${PASS}/${id}`;
export const sourceSnapshot = snapshot;
// Deployment observations are evidence, not an independent audit or public release approval.
export type ReleaseRecord = {
  mode: "PRE_LAUNCH" | "LIVE";
  sourceRepository: string;
  sourceCommit: string;
  design: string;
  addressReconciled: boolean;
  executableMatch: boolean;
  passRuntimeKeccak: `0x${string}`;
  bmcRuntimeKeccak: `0x${string}`;
  explorerSourceVerified: boolean;
  independentReviewAccepted: boolean;
  deployedMintAndBurnValidated: boolean;
  publicMintAuthorization: string;
  confirmedAbiSha256: string;
};
export const SOURCE_ABI_SHA256 =
  "f8ef521233c556d40a71a82c7c4fe843523cc6f6303a9093efcd139b929c7a4f";
export const RELEASE: Readonly<ReleaseRecord> = Object.freeze({
  mode: "PRE_LAUNCH",
  confirmedAbiSha256: SOURCE_ABI_SHA256,
  sourceRepository: LINKS.github,
  sourceCommit: "9963eea05a4682e423a8f0381ccab4e8b43a832a",
  design: "block-random-v1",
  addressReconciled: true,
  executableMatch: true,
  passRuntimeKeccak: snapshot.runtime.pass.keccak as `0x${string}`,
  bmcRuntimeKeccak: snapshot.runtime.bmc.keccak as `0x${string}`,
  explorerSourceVerified: false,
  independentReviewAccepted: false,
  deployedMintAndBurnValidated: true,
  publicMintAuthorization:
    "IdentityMD task 5018f28f-10fd-4c8a-9b86-6873cadb78dc: conditional on documented validation and existing launch checks",
});
export function releaseBlockers(release = RELEASE): string[] {
  const result: string[] = [];
  if (
    release.confirmedAbiSha256 !== SOURCE_ABI_SHA256 ||
    release.design !== "block-random-v1" ||
    !/^https:\/\//.test(release.sourceRepository) ||
    !/^[0-9a-f]{40}$/.test(release.sourceCommit)
  )
    result.push(
      "Reviewed source and ABI pins must match the compiled integration.",
    );
  if (release.mode !== "LIVE") result.push("The website is in PRE_LAUNCH.");
  if (!release.addressReconciled || !release.executableMatch)
    result.push("The deployment must match reviewed source.");
  if (!release.explorerSourceVerified)
    result.push("NFT explorer source verification is not confirmed.");
  if (!release.independentReviewAccepted)
    result.push("Independent security review acceptance is not recorded.");
  if (!release.deployedMintAndBurnValidated)
    result.push("Deployed mint and burn validation is incomplete.");
  if (!release.publicMintAuthorization.trim())
    result.push("A public website release authorization is not recorded.");
  return result;
}
export const asset = (file: string) =>
  `${document.getElementById("root")?.dataset.entry === "mint" ? "../" : "./"}${file}`;
export const routeHref = (route: string) =>
  `${document.getElementById("root")?.dataset.entry === "mint" ? "../" : ""}#/${route}`;
export const shortAddress = (a: Address | string) =>
  `${a.slice(0, 6)}…${a.slice(-4)}`;
