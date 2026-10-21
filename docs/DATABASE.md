# Database — Google Cloud Firestore (Native mode)

Serverless, pay-per-use, scales to festival on-sale spikes, transactional (no overselling), and native to Google Cloud. Local dev uses an identical in-memory store (`data/dev-db.json`). Browsers never access Firestore directly — all access is via the Cloud Run API (rules deny all client access).

| Collection | Key | Purpose / main fields |
|---|---|---|
| `events` | `evt-*` | title, slug, subsidiary, category, description, venue, `performances[] {id, startsAt}`, `tiers[] {id, name, price, capacity, sold, held, salesEnd}`, commissionRate, palette, status (`draft`/`on_sale`) |
| `orders` | `PB` + 8 chars | eventId, performanceId, tierId, qty, unitPrice, subtotal, fee, total, buyer {name, phone, email}, channel (`online`/`pos`), staff, sellerCode, attribution (`code`/`link`/`qr`), commission, flags (e.g. `self_referral`), status (`pending`→`paid`/`failed`/`expired`), payment {method, ref}, accessKey, expiresAt, checkoutRequestId |
| `tickets` | 10-char id | code (`id.HMAC`), orderId, eventId, performanceId, holder, tierName, seat, status (`valid`/`used`), usedAt, usedBy |
| `sellers` | code | name, phone, commissionRate (null = event default), active |
| `bookings` | `BK*` | service, date, slot, name, org, phone, email, location, audience, notes, status (`requested`/`confirmed`/`declined`/`done`) |
| `messages` | `MS*` | contact-form messages |
| `videos` | YouTube id | Virtual Theatre programme: title, channel, mood[], order |
| `audit` | time-based | append-only log of orders, payments, M-Pesa callbacks, scans, bookings (for disputes) |

**Inventory safety:** seats are *held* inside a Firestore transaction when an order is created (15-minute hold), converted to *sold* on payment, and released automatically on failure/expiry.
**Ticket security:** QR codes contain `https://pbagco.com/t/<id>.<HMAC-SHA256>`; forged codes fail signature checks; scans are transactional so a ticket admits exactly once.
**Indexes:** all queries are single-field equality → no composite indexes required.
