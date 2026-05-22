# Utby Snabb Bilservice — Verkstadssystem

Swedish automotive workshop management system for Utby Snabb Bilservice, Göteborg. Full CRUD for invoices (with PDF generation), customers, and vehicles. Enterprise PBS Faktura style with Swedish VAT (moms 25%).

**Två körlägen:**
1. **GitHub Pages (rekommenderat)** — appen körs helt i webbläsaren, data sparas i `localStorage`. Inget backend, ingen databas, inga konton. Auto-deploy via `.github/workflows/deploy.yml`. Se `DEPLOY.md`.
2. **Lokalt med server** — Express + SQLite-fil (`artifacts/api-server/data/app.db`) för dem som vill köra med riktig fil-lagring.

In-browser-läget fungerar via en fetch-interceptor i `artifacts/workshop/src/lib/localApi.ts` som besvarar alla `/api/*`-anrop mot `localStorage` (nyckel `utby.db.v1`). Inga ändringar i React-komponenter eller genererade hooks behövdes.

## Run lokalt (på egen dator)

Förkrav: [Node.js 24+](https://nodejs.org) och [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`).

```bash
pnpm install
pnpm --filter @workspace/workshop run build
pnpm --filter @workspace/api-server run dev
```

Öppna sedan http://localhost:8080 i webbläsaren. Inloggningskod sätts via env-variabeln `ACCESS_CODE` (standard: `19701970hasan`).

Databasfilen skapas automatiskt på `artifacts/api-server/data/app.db` vid första start — alla tabeller skapas också automatiskt. Säkerhetskopiera bara den filen för att backa upp all data.

## Run i Replit

- `pnpm --filter @workspace/api-server run dev` — API + UI (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- Optional env: `DATABASE_URL` — lämna tomt för lokal fil, eller sätt till `file:./annan/sökväg.db` eller en `libsql://`-URL

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS (artifacts/workshop, port 20070 i dev)
- API: Express 5 (artifacts/api-server, port 8080)
- DB: **SQLite via @libsql/client** (pure-JS, ingen native-byggsteg) + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- PDF: @react-pdf/renderer
- Charts: Recharts
- Forms: react-hook-form
- Routing: wouter

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all routes)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle ORM table definitions (sqliteTable; customers, vehicles, invoices)
- `lib/db/src/index.ts` — DB-anslutning + auto-create tables vid uppstart
- `artifacts/api-server/src/routes/` — Express route handlers (customers, vehicles, invoices, dashboard, auth)
- `artifacts/workshop/src/pages/` — React pages (dashboard, invoices, customers, vehicles)
- `artifacts/workshop/src/components/` — Layout, StatusBadge, InvoicePdf
- `artifacts/workshop/src/index.css` — CSS theme (steel-grey sidebar, amber primary)

## Architecture decisions

- **Lokal SQLite-fil** istället för Postgres — inga konton, inga molnberoenden, allt på disk
- Tabeller skapas automatiskt vid uppstart (`CREATE TABLE IF NOT EXISTS`) — inga manuella migrations
- Contract-first: OpenAPI spec drives all codegen; never write API clients by hand
- Invoice items are always fetched inline with the invoice (InvoiceDetail schema includes `items[]`)
- Swedish locale throughout: dates, currency (sv-SE Intl formatters), status labels
- PDF generated entirely client-side via @react-pdf/renderer — no server involvement
- Sidebar navigation with wouter for SPA routing under base path

## Product

- **Dashboard**: stats cards (customers, vehicles, invoices, revenue), status breakdown, monthly revenue bar chart, recent invoices
- **Fakturor**: list with search + status filter, inline status transitions (Utkast→Skickad→Betald), delete
- **Faktura editor**: full form with customer/vehicle selector dropdowns, doc-type selector (Faktura/Offert/Påminnelse), line items table (type, art.nr, qty, price, discount, VAT), auto-calculated totals, PDF download
- **Kunder**: list with search, CRUD forms, customer detail with vehicle/invoice history
- **Fordon**: list with search, CRUD forms, vehicle detail with service history

## Company info

- Utby Snabservice (UTBY SNABSERVICE on PDF)
- VAGNMAKAREGATAN 2, 41507 GÖTEBORG
- Tel: 076-4221051
- Mobil: 0720040936
- info@utbysnabbbilservice.se
- Momsreg nr/VAT-nr: 000520-6552
- Bankgiro: 5930-0897
- Org.nr: 556XXX-XXXX (placeholder)

## User preferences

- All UI text in Swedish
- Status labels: Utkast / Skickad / Betald / Förfallen / Avbruten
- Item types: Reservdel / Arbete / Olja / Däckavgift / Miljöavgift / Diagnos / Fastpris / Rabatt / Övrigt
- VAT: 25% default (Swedish moms), also supports 12%, 6%, 0%
- Currency formatting: sv-SE locale (7 000,00 kr)

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- Schemaändringar i `lib/db/src/schema/*` — uppdatera även `CREATE TABLE`-statements i `lib/db/src/index.ts` (de gäller bara om tabellen inte redan finns)
- Zod generated schema names: body schemas use `CreateXBody`/`UpdateXBody` (NOT `XInput`)
- The `useListInvoices` filter param is `status` (singular), not `statuses`
- Never use `console.log` in server code — use `req.log` in route handlers
- SQLite `LIKE` är case-insensitive bara för ASCII — för svensk söks åäö används `lower()`-wrap (se `likeLower()` i routes)
- `DATABASE_URL` ignoreras om den inte börjar med `file:`, `libsql:`, `http(s)://` eller `ws(s)://` — så ärvda Postgres-URL:er stör inte lokal körning

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
