# Submission path budget

The maximum complete bundle is 8,388,608 bytes. `.gitignore` is explicitly budgeted at 512 bytes and excludes only generated directories, including dependencies at every nesting level. No required runtime assets are excluded. `dist/` is included.

| Paths | Target budget | Purpose |
| --- | ---: | --- |
| `web/` excluding generated dependencies | 3,620,000 bytes | Source, lockfile, scripts and all runtime assets, including 2,052,792-byte lossless Genesis WebP and every original preview |
| `dist/` | 4,380,000 bytes | Complete production export, including the same lossless Genesis image, all previews, wallet SDK, share assets and static mint entry |
| `docs/` | 310,000 bytes | Evidence, ABIs, review, validation and reproducible checks |
| Root Markdown documentation | 50,000 bytes | README, implemented design system and security review |
| `.gitignore` | 512 bytes | Explicit exclusions above |
| `**/node_modules/`, `**/.vite/`, `**/.cache/`, `**/.npm/`, `**/.pnpm-store/`, `**/coverage/`, `**/*.tsbuildinfo`, `test/scratch/` | 0 bytes | Generated dependencies, caches and temporary research/testing |

These explicit budgets sum to 8,360,512 bytes, below the hard cap. Actual submission size is measured with `node web/scripts/check-delivery.mjs` and recorded in `docs/VALIDATION.md`; targets may be rebalanced within the hard overall cap. No nested Git repository, npm archive or registry mirror is delivered. Lossless image conversion preserves every original decoded pixel; it does not discard required artwork. The original PNG's provenance, original byte hash and matching decoded-pixel hash are recorded in `docs/evidence/artwork.json`.
