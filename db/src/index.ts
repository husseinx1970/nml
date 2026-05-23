import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

function resolveDbUrl(): string {
  const raw = process.env.DATABASE_URL;
  // Använd endast DATABASE_URL om den pekar på en SQLite-fil eller libsql-server.
  // Ignorera arv från Postgres/andra databaser så lokal körning bara funkar.
  if (raw && (raw.startsWith("file:") || raw.startsWith("libsql:") || raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("ws://") || raw.startsWith("wss://"))) {
    return raw;
  }
  return `file:${path.join(process.cwd(), "data", "app.db")}`;
}

const dbUrl = resolveDbUrl();

// Säkerställ att mappen för filen finns
if (dbUrl.startsWith("file:")) {
  const filePath = dbUrl.slice("file:".length);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

// ─── Auto-skapa tabeller om de inte finns ─────────────────────────────────────
// Körs vid serverstart så användaren slipper köra migrations manuellt.
async function ensureTables() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organization_number TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      postal_code TEXT,
      city TEXT,
      reference TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      registration_number TEXT NOT NULL,
      make TEXT,
      model TEXT,
      year INTEGER,
      vin TEXT,
      fuel_type TEXT,
      engine_info TEXT,
      mileage INTEGER,
      first_registration_date TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL,
      order_number TEXT,
      offer_number TEXT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      customer_org_number TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      customer_postal_code TEXT,
      customer_city TEXT,
      vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
      registration_number TEXT,
      vehicle_make TEXT,
      vehicle_model TEXT,
      vehicle_year INTEGER,
      vin TEXT,
      mileage INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      invoice_date TEXT NOT NULL,
      due_date TEXT,
      payment_terms TEXT,
      mechanic TEXT,
      internal_reference TEXT,
      workshop_notes TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      vat_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL DEFAULT 'part',
      article_number TEXT,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT,
      unit_price REAL NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      vat_rate REAL NOT NULL DEFAULT 25,
      line_total REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      mechanic_name TEXT
    )
  `);
}

await ensureTables();

export * from "./schema";
