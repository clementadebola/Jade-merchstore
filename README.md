# FORM / OBJECT — Printify + Bachs storefront starter

A minimal Next.js App Router storefront starter using TypeScript and styled-components. This is **Stage 1**: the catalogue can be fetched from a Printify shop on the server, and the product grid/cart UI is in place. Payment and fulfilment are deliberately disabled until server-side pricing, shipping and Bachs approval are configured.

## Stack
- Next.js App Router + TypeScript
- styled-components SSR registry
- Printify REST API for products and variants
- Supabase/PostgreSQL schema for catalogue, orders, webhook idempotency and shipment state
- Bachs hosted checkout is planned for Stage 3

## Start locally
1. Install Node.js 20.19.4+.
2. Copy `.env.example` to `.env.local`.
3. Set `PRINTIFY_API_TOKEN` and `PRINTIFY_SHOP_ID`.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
5. Open http://localhost:3000.

If Printify credentials are not configured, the storefront shows a catalogue-unavailable message rather than exposing server errors.

## Printify setup
- Create a custom/API store in Printify if needed.
- Create a Personal Access Token for your own merchant account.
- Find the shop ID with `GET https://api.printify.com/v1/shops.json`.
- Product listing uses `GET /v1/shops/{shop_id}/products.json?limit=50&page=N`.
- See https://developers.printify.com/

## Product pricing
**Never use Printify production cost as the retail price.** This starter expects retail pricing to be configured in the database during Stage 2. The UI temporarily recognises a `retail_cents:1999` tag for design preview only; remove that preview convention once the database pricing source is connected. Checkout is disabled in this build.

## Supabase
1. Create a Supabase project.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in local environment and hosting secrets.
3. Apply `supabase/migrations/0001_store_schema.sql`.
4. Keep the service role key server-only. The migration enables RLS and defines no public write policies.

## Bachs integration safety
Bachs' official docs describe hosted checkout and `collection.succeeded` webhooks. Do not mark orders paid or submit them to Printify based on a success redirect. Verify webhook signatures over the exact raw request body, deduplicate event IDs, validate amount/currency/order reference, and make fulfilment idempotent.

Official docs:
- https://docs.bachs.io/guides/checkout/accept-a-payment
- https://docs.bachs.io/
- https://developers.printify.com/
- https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

**Important eligibility check:** Bachs currently describes itself as focused on SaaS, AI and digital businesses. Before enabling live checkout for physical POD merchandise, get written confirmation from Bachs that your business category is supported. The `BACHS_PHYSICAL_GOODS_APPROVED` environment flag is intentionally false by default.

## Next stages
- Stage 2: sync Printify product/variant data into Supabase; set explicit retail prices; implement product detail and variant picker; integrate destination-specific Printify shipping calculations.
- Stage 3: create a pending order server-side, create Bachs hosted checkout session, save checkout ID, redirect to returned checkout URL, verify signed webhook and atomically mark order paid.
- Stage 4: submit paid orders to Printify, save Printify order ID, prevent duplicate submission, process Printify webhooks and track shipment.
- Stage 5: test sandbox, signature failures, duplicate/out-of-order webhooks, failed payment, stock/variant changes, shipping and refund paths.

## Deployment
Deploy to a Node-compatible Next.js host. If using Netlify, confirm that the selected adapter supports the Next.js features and route runtime you use. Configure all secrets in the host dashboard and set `STORE_URL` to your final HTTPS domain.
