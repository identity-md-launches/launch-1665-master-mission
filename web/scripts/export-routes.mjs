import { readFile, writeFile, mkdir } from "node:fs/promises";
const html = await readFile("../dist/index.html", "utf8");
await mkdir("../dist/mint", { recursive: true });
// An explicit static /mint/ entry retains relative assets at every gateway subpath.
await writeFile(
  "../dist/mint/index.html",
  html
    .replaceAll('"./', '"../')
    .replace('id="root"', 'id="root" data-entry="mint"'),
);
