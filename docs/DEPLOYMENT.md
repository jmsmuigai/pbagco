# Deploying pbagco.com on Google Cloud

Architecture: **Cloud Run** (one container: site + API + Gemini bot + MCP) · **Firestore** · **Secret Manager** (`GEMINI_API_KEY`, `TICKET_SECRET`, `STAFF_PIN`, later M-Pesa keys) · optional **Firebase Hosting** in front for CDN + custom domain.

## 1. Deploy
```bash
gcloud auth login
PROJECT=<your-project-id> ./deploy.sh        # region defaults to africa-south1 (Johannesburg)
```
The script enables APIs, creates Firestore, creates `TICKET_SECRET` + `STAFF_PIN` secrets, grants access to the existing `GEMINI_API_KEY` secret, and deploys with `PAYMENTS_MODE=mock` (safe demo).

## 2. Domain pbagco.com
Option A — Cloud Run domain mapping: `gcloud beta run domain-mappings create --service pbagco-web --domain pbagco.com --region africa-south1`, then add the DNS records it prints at the domain's DNS host (e.g. Cloudflare — set records to *DNS only* until the certificate is issued). Repeat for `www.pbagco.com`.
Option B — Firebase Hosting in front (CDN, instant SSL): `cd firebase && firebase deploy --only hosting,firestore` then *Add custom domain* in the Firebase console. (If Firebase rewrites don't support your Cloud Run region, deploy the service to `europe-west1`.)

## 3. Go live with M-Pesa
1. Get Daraja production credentials (Paybill or Till) for PBAG's central account.
2. Store `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY` in Secret Manager; set env `MPESA_SHORTCODE`, `MPESA_TYPE` (`CustomerPayBillOnline` or `CustomerBuyGoodsOnline`).
3. Test with `PAYMENTS_MODE=sandbox`, then switch to `live`. Callback URL: `https://pbagco.com/api/pay/mpesa/callback`.
Card (e.g. Pesapal) and PayPal are wired as payment methods; they show "Coming soon" until their keys are added and the provider call is filled in `server/payments.js`.

## 4. After launch
- Staff console: `https://pbagco.com/staff` (PIN from Secret Manager). Install it on gate phones via "Add to Home screen".
- Edit events in Firestore console (`events` collection) or ask TovuTech to add an event editor.
