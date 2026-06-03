# RFP → Framer Bridge

A tiny serverless service that lets **Make.com** publish RFPs into the **Framer CMS**.
Make can't run Framer's `framer-api` Node SDK directly, so this wraps it behind two
simple webhook URLs that Make can call.

## What it does

- `POST /api/setup` — run **once**. Creates the `RFPs` CMS collection + fields in Framer.
- `POST /api/publish` — called by Make every time you check **Publish to Web** in Smartsheet.
  Upserts the RFP into the CMS, publishes the site, and returns the live page URL.

Both endpoints require the header `x-bridge-secret: <BRIDGE_SECRET>`.

## Deploy (Vercel, free tier)

1. Install the [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
2. In this folder: `npm install`
3. `vercel` (follow prompts to create the project)
4. In the Vercel dashboard → Project → Settings → Environment Variables, add the
   four values from `.env.example` (`FRAMER_API_KEY`, `FRAMER_PROJECT_URL`,
   `SITE_BASE_URL`, `BRIDGE_SECRET`).
5. `vercel --prod` to deploy. Your URLs will be:
   - `https://<your-project>.vercel.app/api/setup`
   - `https://<your-project>.vercel.app/api/publish`
6. Run setup once: `curl -X POST https://<your-project>.vercel.app/api/setup -H "x-bridge-secret: <BRIDGE_SECRET>"`

## Publish payload (what Make sends to /api/publish)

```json
{
  "rfpNumber": "2026-215",
  "title": "Public Area Upholstered Seating",
  "summary": "Reliance Hospitality is seeking qualified vendors for ...",
  "scopeOfWork": "FF&E",
  "location": "Tulsa, OK",
  "brand": "Hilton",
  "budgetRange": "$250K–$400K",
  "deadline": "2026-07-15",
  "status": "Submissions Open"
}
```

To remove a published RFP: `{ "rfpNumber": "2026-215", "unpublish": true }`.

## Notes

- The **gated** fields (RFP Package URL, contact, submission instructions) are
  deliberately NOT sent here. They never touch the public site. The PDF is delivered
  after the vendor fills the form, by the Make "Vendor Capture" scenario.
- Verified against `framer-api` 0.1.12 (pinned in package.json). The Server API is in
  open beta (launched Feb 2026); the `RFPs` collection is a **managed collection**, which
  is what allows the API to write items. If you bump the SDK, re-check `lib/framer.js`.
