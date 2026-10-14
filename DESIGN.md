# BMC Illuminati design system

The final source preserves the supplied main site's black-and-gold identity, eye/triangle emblem, serif hero, slogan **Know · Create · Burn · Rise**, original artwork and restrained motion. It adds real collection/wallet states within that system. It does not substitute a new brand or generated artwork. The original component stylesheet is `web/src/preserved.css`, the existing gold layer is `gold.css`, and functionality/responsive additions are in `app.css`.

## Tokens implemented

| Role | Value |
| --- | --- |
| Page / raised background | `#090909` / `#121210` |
| Surface / hover surface | `#151512` / `#22221c` |
| Main / secondary text | `#f5f0e4` / `#bcb7aa` |
| Gold action / lighter gold link | `#d4af37` / `#ecd68d` |
| Border / strong control border | `#35352c` / `#777263` |
| Focus / error | `#fff1b0` / `#ffa79b` |
| Small / medium / large radius | 6px / 10px / 14px |
| Button radius | 8px |
| Content maximum | 76rem (1216px at the normal root size) |

Gold primary buttons use black text. Links remain visibly gold; status is also expressed in words, not only color. Disabled actions use dark surfaces and explicit adjacent reasons. Shadows are removed from the inherited card layer; hierarchy comes from spacing, borders, artwork and typography. Warning borders use `#6c5926`. Browser focus outlines are 2px with a 4px offset. Forced-colors rules restore system outlines/control borders.

Typography uses local system sans-serif for interface text, Georgia/Times serif for the hero and page h1, and the inherited system monospace stack for contract addresses. No remote fonts are needed. The type scale is 0.875rem, 1rem, 1.25rem, 1.5rem, 2.25rem and 3.5rem, with weights 400/600/700. Labels and small text are at least 14px; form inputs use 16px. Desktop h1 is 56px and mobile h1 is 36px; heading line-height is 1.08–1.3, and body copy retains the inherited readable line-height. There are no small tracked uppercase eyebrow labels. Numeric balances use tabular figures; exact raw arithmetic is independent of display truncation.

The inherited spacing tokens use a 4px base (`--space-1` through larger multiples). Components use 8/12/16/20/24/32/40/48/64px gaps/padding as appropriate. A section groups its heading, explanation and controls; unrelated sections have larger separation. Body text is constrained to readable measures rather than stretched across the desktop.

## Components and states

- Header: original emblem/wordmark, one wallet control, desktop route links and official project-link row. Compact widths use an explicit Menu control. Navigation marks the current page and route changes move focus to main content.
- Hero: four-word product headline, one plain description, mint/collection actions on the first mobile screen, followed by authentic Genesis artwork and labelled chain statistics. No blocking intro.
- Data: stat grids, explicit timestamps/block links, historical-snapshot labels, retry/loading/error states, owner addresses that wrap, and unavailable values when no deployment exists. Financial figures are never replaced by marketing estimates.
- NFT: square artwork, token identity, real owner, nine metadata attributes, provenance and reveal state. Original preview gallery is a separate labelled disclosure with 12 images per page and category controls.
- Forms: persistent labels, near-control directions, 48px minimum inputs, inline validation/status text, clear loading/disabled buttons and a transaction review dialog. Draft upload restrictions are stated before choosing a file.
- Wallet dialog: desktop modal / mobile bottom sheet; named wallet rows with recognizable marks, 52px minimum rows, mobile app links, Coinbase option, close/Escape, focus containment and restoration. Rejection leaves a usable retry path.
- Mint: distinct approval and mint buttons, explicit phase/price/allowance, reveal queue status, truthful release blockers and local transaction receipt recovery. No disabled control implies that funds can already be deposited.
- Staking/launchpad/utility: consistent panels explaining current availability, useful wallet reads or local drafts, and disabled unverified financial operations. No fake yield, chart, funded reward or success message.
- Footer/community: confirmed GitHub/Etherscan/IMD and internal feature links; X/Telegram remain labelled unconfirmed. Decorative eye motion can be paused.

## Responsive behavior

At 1260px and above, full navigation is visible; below that, mobile navigation is used. At 900px, statistic grids become two columns and two-column panel gaps shrink. At 700px, page panels and expanded NFT details stack, artwork becomes full width, the container has 16px side gutters, and the wallet dialog docks to the bottom with safe-area padding. At 359px and below, header controls occupy a second row and hero actions become full-width. The preview gallery uses four desktop columns and two mobile columns. Addresses/long metadata wrap instead of hiding overflow.

The 390px first screen shows BMC Illuminati and “Explore NFT minting.” The design probe covers 320, 390 and 1440px; interaction checks also cover 768px. A 320px view with 200% root text was checked for reflow. No horizontal overflow is masked with a global hidden rule.

## Motion, accessibility and assets

The original eye pulse is retained with a user pause control and disabled under `prefers-reduced-motion`. It communicates no essential information. Native semantic buttons/links/inputs, one h1 per route, skip link, visible focus, accessible dialog naming and status regions support keyboard and assistive technology use. Automated Axe coverage and browser focus checks are recorded in `docs/VALIDATION.md`; they are not a full screen-reader audit.

Genesis #1 is the original image losslessly encoded to WebP, with equal decoded-pixel hashes documented in `docs/evidence/artwork.json`. All 77 Genesis and 12 Standard previews retain their original bytes. The local share image and favicon preserve the project identity. Wallet marks retain their attribution in `docs/WALLET-MARKS-LICENSE.txt`. Better Interface's six domains were applied during implementation and reviewed afterward; coverage, specific fixes and limitations are in `docs/VALIDATION.md`, with guidance attribution in `docs/DESIGN-GUIDANCE-LICENSE.txt`.
