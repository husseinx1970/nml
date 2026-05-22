# Utby Snabb Bilservice — Verkstadssystem

Svenskt verkstadssystem för bilservice. Hantering av fakturor (med PDF-generering), kunder och fordon. PBS Faktura-stil med svensk moms (25 %).

Privat åtkomst via kod.

## Stack

- **pnpm workspaces**, Node.js 24, TypeScript 5.9
- **Frontend**: React 19 + Vite 7 + Tailwind CSS — `artifacts/workshop` (port 20070)
- **API**: Express 5 + express-session — `artifacts/api-server` (port 8080)
- **DB**: PostgreSQL + Drizzle ORM
- **Validering**: Zod (`zod/v4`), `drizzle-zod`
- **API-codegen**: Orval (från OpenAPI-spec)
- **PDF**: `@react-pdf/renderer`
- **Charts**: Recharts
- **Routing**: wouter

## Krav

- Node.js 24+
- pnpm 10+
- En PostgreSQL-databas

## Kom igång

```bash
# 1. Installera beroenden
pnpm install

# 2. Skapa .env i projektroten med:
#    DATABASE_URL=postgres://user:pass@host:5432/dbname
#    SESSION_SECRET=<lång slumpmässig sträng>
#    ACCESS_CODE=<din inloggningskod>   # default: 19701970hasan

# 3. Pusha databasschemat
pnpm --filter @workspace/db run push

# 4. Starta utvecklingsservern (i två terminaler)
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/workshop run dev
```

Öppna `http://localhost:20070` och logga in med din `ACCESS_CODE`.

## Bygg & deploy

```bash
pnpm run typecheck   # full typkontroll
pnpm run build       # bygger alla paket
```

Frontend bygger till `artifacts/workshop/dist/` (statiska filer).
API bygger till `artifacts/api-server/dist/index.mjs` (Node CJS-bundle).

Servera frontend statiskt (t.ex. nginx) och kör API:t med `node dist/index.mjs`. Båda måste exponeras under samma domän så att session-cookien fungerar.

## Projektstruktur

```
artifacts/
  api-server/       Express API + auth + Drizzle-routes
  workshop/         React-frontend (verkstadssystem)
  mockup-sandbox/   Komponentförhandsgranskning (dev only)
lib/
  api-spec/         OpenAPI-spec (sanningskälla)
  api-client-react/ Genererade React Query-hooks
  api-zod/          Genererade Zod-scheman
  db/               Drizzle ORM-scheman
```

## Funktioner

- **Dashboard** – statistik, omsättningsdiagram, senaste fakturor
- **Fakturor** – CRUD, statusövergångar (Utkast → Skickad → Betald), PDF-nedladdning, livet förhandsgranskning
- **Kunder** – CRUD med fordon- och faktura-historik
- **Fordon** – CRUD med servicehistorik
- **Auth** – sessionsbaserad åtkomstkod, 30 dagars cookie

## Företagsuppgifter

Företagsinformation som visas i PDF och appen är hårdkodad i:

- `artifacts/workshop/src/components/InvoicePdf.tsx` (objektet `CO` i toppen)

Justera där om du vill byta adress, telefon, bankgiro etc.

## Säkerhet

- Åtkomstkoden lagras som env-variabel `ACCESS_CODE` (default i koden, byt i produktion!)
- Session-cookie är `httpOnly` och `secure` i produktion
- Alla `/api/*`-routes (förutom `/api/auth/*` och `/api/healthz`) kräver giltig session

## Licens

Privat — © Utby Snabb Bilservice AB
