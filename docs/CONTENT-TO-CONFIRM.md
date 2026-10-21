# Content PBAG needs to confirm before launch

1. **Event dates, venues & prices** — the four seeded events (Bunge Youth Governance Forum 7 Nov; PGT Festival Ndeiya 14–16 Nov; Peatice Comedy Night 28 Nov; Ithaka cia Kamĩrĩĩthũ 11–13 Dec) use provisional dates/prices. Only "PGT Festival 7th edition, Ndeiya, Royoh/Kamangu, 0725 787 214" and "Ithaka cia Kamĩrĩĩthũ" came from earlier material.
2. **Social handles** — Instagram/TikTok are set to `pbagtheatre` (the handle on the consortium logo). Facebook and YouTube are confirmed.
3. **Event artwork & galleries** — the shared Drive folder "PBAG CONTENT" (UPCOMING SHOWS, PAST SHOWS › PBAG BUNGE) was empty when the site was built. Add photos there; they slot into `public/data/gallery.json` per subsidiary. Posters are currently generated in code (light, fast, on-brand).
4. **Team names** — the team photo shows roles only (per the brief). Add names if PBAG wants them public.
5. **Virtual Theatre programme** — 6 verified Kenyan comedy videos + PBAG's channel; add more in Staff › Programme.
6. **Payment accounts** — M-Pesa Paybill/Till for the central account; card/PayPal provider choice.
7. **Refund policy wording** in the FAQ.

## Added with the Ithaka cia Kamĩrĩĩthũ release (Oct 2026)
8. **Boniface Kanyuira must review `/ithaka`** — the page is bylined "Story by Boniface Kanyuira". The history was compiled from published sources (listed on the page) and should be approved by him before launch.
9. **Chief Mukoma** — no record was found in the published archives searched. The page carries an "open file" inviting families to share letters, photos or testimony; update it once records are confirmed.
10. **Boniface Kanyuira's own videos** — no YouTube channel or videos under his name were found. Send links and add them in Staff › Programme (shelf: PBAG Originals).
11. **Heritage map** — sites marked "approximate" (Kereita forest centre, Ihiga rĩa Gũoya, the Kamĩrĩĩthũ centre site, Kirenga homestead, forest extents) should be confirmed with a GPS visit. Mau Mau routes are labelled as indicative corridors, not surveyed tracks.
12. **Historic photos** load from Wikimedia Commons with their licences credited; replace with PBAG's own archive photos when available.

## Added with the Paybill · Auditions · NLP · Kiswahili release (Oct 2026)

| Item | Where | What PBAG must confirm |
|---|---|---|
| **M-Pesa Paybill number & account name** | env `PAYBILL_NUMBER`, `PAYBILL_ACCOUNT_NAME` | Site shows placeholder `000000` and a "placeholder" notice until set. |
| **Bank details** | env `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_BRANCH` | Placeholders until set. |
| **Auto-confirmation of Paybill payments** | env `C2B_TOKEN`; register `https://pbagco.com/api/pay/mpesa/c2b/<C2B_TOKEN>/confirmation` with Safaricom Daraja (C2B) | Without it, pasted codes go to *Staff → Inbox* for a one-click approval. |
| **Audition dates, venues and roles** | `server/content.js` → `SEED_AUDITIONS` | All four calls are provisional. |
| **Ex-Chief Mũkoma wa Njiriiri card** | `src/pages/ithaka.html` | Text is as supplied by PBAG (Tignor's "petty oppression" passage and the Mbũrũ wa Njiriiri biography were not independently verified online). |
| **Kiswahili translation** | `src/i18n/sw/*.json`, `public/assets/js/i18n.js` | Drafted by the build team (Gemini was not reachable from the build environment). Have a native speaker review, or run `GEMINI_API_KEY=… npm run translate` to (re)generate with Gemini — output lands in `src/i18n/sw/50-gemini.json`. Event descriptions, heritage-site descriptions and the AI-film simulation logs stay in English for now. |
| **Board / Management escalation** | Staff → Inbox | Questions Cue can't answer arrive here with an `ES…` reference; decide who replies and how fast. |
