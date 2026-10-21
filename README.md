# pbagco.com — PBAG Consortium website

Theatre-and-film themed website for **PBAG Consortium (Peers Best Art Group)** with a full ticketing platform, booking calendar, Virtual Theatre, Gemini-powered AI usher ("Cue"), Generative-AI consultancy page and an MCP server for AI agents. Built by TovuTech for Google Cloud.

## Live preview (GitHub Pages)
https://jmsmuigai.github.io/pbagco/ — rebuilt automatically on every push to `master` (`.github/workflows/pages.yml`).
This is a **static preview**: the API runs in the browser, payments are simulated and tickets are watermarked *PREVIEW · NOT VALID*. The production site (real M-Pesa, Firestore, live Gemini, staff console) runs on Google Cloud Run — see `docs/DEPLOYMENT.md`.
The previous Next.js version is kept on the `legacy-nextjs` branch.

## Run it locally (2 minutes)
```bash
npm install
npm start            # http://localhost:8080  (memory DB, simulated M-Pesa, offline FAQ bot)
npm test             # in a second terminal: end-to-end API smoke test
```
Staff console: http://localhost:8080/staff — default dev PIN `2468`.
Add `GEMINI_API_KEY=...` before `npm start` to switch Cue and AI Spark to live Gemini.

Editing pages: change files in `src/pages/` or `src/partials/`, then `npm run build` (writes `public/*.html`).
Other builds: `BASE=/pbagco/ npm run build:pages` (static site in `_site/`), `npm run build:preview` (whole site in one offline file, `dist/pbagco-preview.html`).

## Languages: English + Kiswahili

Every public page is also built at `/sw/…` (switch with the **SW / EN** button in the header; `hreflang` tags and the sitemap link the pairs).
Page text is translated segment-by-segment from the English source using `src/i18n/sw/*.json`; script strings live in `public/assets/js/i18n.js`.
`npm run build` warns about any untranslated segment, and `GEMINI_API_KEY=… npm run translate` fills the gaps with Gemini. Cue answers in Kiswahili on `/sw/` pages.

## What's inside
| Page | Highlights |
|---|---|
| `/` Home | Curtain-reveal intro, spotlight beams, marquee-bulb "Now Showing" carousel, ticket-stub event cards, film-strip of subsidiaries |
| `/about` | History (founded 23 Aug 2011, Limuru), purpose, mission, vision, values, management team (real team photo) |
| `/subsidiaries` | Same template ×4: details, mission, offers, gallery, WhatsApp Join, Book, Ask Cue |
| `/theatre` | Virtual Theatre: proscenium stage, curtains, house-lights dimmer, hover previews, AI mood picker, PBAG channel |
| `/tickets` | Box office: event calendar → date → tier/qty → details (+seller code) → M-Pesa/card/PayPal → QR tickets (PDF/PNG/calendar) · My Tickets lookup · QR verify · seller programme |
| `/book` | Book Us: 5 services, live availability calendar, time slots, request + .ics |
| `/consultancy` | PBAG AI Studio: Generative AI consultancy + live "AI Spark" Gemini demo |
| `/ithaka` | **Ithaka cia Kamĩrĩĩthũ** — long-form, sourced history (creation, chiefs, Tigoni, Lari, Mau Mau, Ngũgĩ) in a colonial-archive design, three.js 3D hero, historic-sites gazetteer, tie-in to the play |
| `/heritage-map` | **PBAG Heritage Atlas** (Leaflet GIS): colonial-sepia, street, hybrid satellite & topo basemaps; Kiambu/Limuru/Lari boundaries (OSM); 25 historic sites; forests; indicative Mau Mau routes |
| `/ai-film` | PBAG AI in Theatre & Film — Google AI toolchain + interactive studio simulator |
| `/events` | PBAG Events — event management, live shows, PR, digital content, publications, ticketing |
| `/contact` | Contacts, map, form, FAQ |
| `/staff` | PIN-protected: live dashboard, camera gate scanner, door POS, bookings, programme editor, seller codes + QR |

API & AI: `server/index.js` (REST), `server/gemini.js` (Cue + Spark), `server/tools.js` (shared tool layer), `server/mcp.js` (MCP at `/mcp`).

See `docs/DEPLOYMENT.md`, `docs/DATABASE.md`, `docs/MCP.md`, `docs/CONTENT-TO-CONFIRM.md`.
