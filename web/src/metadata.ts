import { CID } from "./config";
export type Metadata = {
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string | number }[];
};
const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : "";
export function decodeMetadata(uri: string): Metadata {
  if (uri.length > 250_000)
    throw new Error("NFT metadata exceeds the safe size limit.");
  let json: string;
  if (uri.startsWith("data:application/json;base64,")) {
    const encoded = uri.slice("data:application/json;base64,".length);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
      throw new Error("Invalid base64 metadata.");
    json = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
    );
  } else if (uri.startsWith("data:application/json,"))
    json = decodeURIComponent(uri.slice("data:application/json,".length));
  else throw new Error("The collection returned an unsupported metadata URI.");
  const raw: unknown = JSON.parse(json);
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid NFT metadata object.");
  const m = raw as Record<string, unknown>;
  if (typeof m.name !== "string" || typeof m.image !== "string")
    throw new Error("The NFT name or artwork URI is missing.");
  imageCandidates(m.image); // Validate before rendering; metadata never becomes HTML.
  return {
    name: text(m.name, 200),
    description: text(m.description, 2000),
    image: m.image,
    attributes: Array.isArray(m.attributes)
      ? m.attributes.slice(0, 40).flatMap((v) => {
          if (
            !v ||
            typeof v !== "object" ||
            typeof v.trait_type !== "string" ||
            !["string", "number"].includes(typeof v.value)
          )
            return [];
          return [
            {
              trait_type: text(v.trait_type, 100),
              value:
                typeof v.value === "number" && Number.isFinite(v.value)
                  ? v.value
                  : text(v.value, 200),
            },
          ];
        })
      : [],
  };
}
export function imageCandidates(uri: string): string[] {
  const file = uri.startsWith(`ipfs://${CID}/`)
    ? uri.slice(`ipfs://${CID}/`.length)
    : "";
  if (/^genesis-(0[1-9]|[1-6][0-9]|7[0-7])\.png$/.test(file))
    return [
      `https://gateway.pinata.cloud/ipfs/${CID}/${file}`,
      `https://silver-active-lungfish-941.mypinata.cloud/ipfs/${CID}/${file}`,
      `https://ipfs.io/ipfs/${CID}/${file}`,
    ];
  if (
    /^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri) &&
    uri.length <= 250000
  )
    return [uri];
  throw new Error("Artwork URI does not belong to the verified collection.");
}
export function tokenIdInput(value: string): number {
  if (!/^[1-9]\d{0,2}$/.test(value) || Number(value) > 500)
    throw new Error("Enter a token ID from 1 to 500.");
  return Number(value);
}
export function safeURL(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password)
    throw new Error("Use a public HTTPS URL without credentials.");
  return u.href;
}
