// In-browser "backend" for Utby Snabb Bilservice.
// All data is stored in localStorage; no server is needed.
// Installs a global fetch interceptor that handles /api/* requests.

type Json = Record<string, unknown>;

const STORE_KEY = "utby.db.v1";
const AUTH_KEY = "utby.auth.v1";
const DEFAULT_ACCESS_CODE = "19701970hasan";

interface Customer {
  id: number;
  name: string;
  organizationNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Vehicle {
  id: number;
  customerId: number | null;
  registrationNumber: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  fuelType: string | null;
  engineInfo: string | null;
  mileage: number | null;
  firstRegistrationDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  orderNumber: string | null;
  offerNumber: string | null;
  customerId: number | null;
  customerName: string | null;
  customerOrgNumber: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerPostalCode: string | null;
  customerCity: string | null;
  vehicleId: number | null;
  registrationNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vin: string | null;
  mileage: number | null;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  invoiceDate: string;
  dueDate: string | null;
  paymentTerms: string | null;
  mechanic: string | null;
  internalReference: string | null;
  workshopNotes: string | null;
  subtotal: number;
  vatAmount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceItem {
  id: number;
  invoiceId: number;
  itemType:
    | "part"
    | "labor"
    | "oil"
    | "tire_fee"
    | "environmental_fee"
    | "diagnostic"
    | "fixed_price"
    | "discount"
    | "other";
  articleNumber: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  discountPercent: number;
  vatRate: number;
  lineTotal: number;
  sortOrder: number;
  mechanicName: string | null;
}

interface Db {
  customers: Customer[];
  vehicles: Vehicle[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  seq: { customer: number; vehicle: number; invoice: number; item: number };
}

const emptyDb = (): Db => ({
  customers: [],
  vehicles: [],
  invoices: [],
  invoiceItems: [],
  seq: { customer: 0, vehicle: 0, invoice: 0, item: 0 },
});

function loadDb(): Db {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      customers: parsed.customers ?? [],
      vehicles: parsed.vehicles ?? [],
      invoices: parsed.invoices ?? [],
      invoiceItems: parsed.invoiceItems ?? [],
      seq: parsed.seq ?? { customer: 0, vehicle: 0, invoice: 0, item: 0 },
    };
  } catch {
    return emptyDb();
  }
}

function saveDb(db: Db) {
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

function nowIso() {
  return new Date().toISOString();
}

function nextId(db: Db, kind: keyof Db["seq"]): number {
  db.seq[kind] = (db.seq[kind] ?? 0) + 1;
  return db.seq[kind];
}

function nullify<T extends Json>(obj: T, fields: string[]): T {
  for (const f of fields) {
    if (!(f in obj)) (obj as Json)[f] = null;
  }
  return obj;
}

function matches(value: string | null | undefined, search: string): boolean {
  if (!value) return false;
  return value.toLowerCase().includes(search.toLowerCase());
}

function recalcInvoice(db: Db, invoiceId: number) {
  const items = db.invoiceItems.filter((i) => i.invoiceId === invoiceId);
  let subtotal = 0;
  let vatAmount = 0;
  for (const it of items) {
    const net = it.quantity * it.unitPrice * (1 - (it.discountPercent ?? 0) / 100);
    subtotal += net;
    vatAmount += net * ((it.vatRate ?? 25) / 100);
  }
  const inv = db.invoices.find((i) => i.id === invoiceId);
  if (inv) {
    inv.subtotal = round2(subtotal);
    inv.vatAmount = round2(vatAmount);
    inv.total = round2(subtotal + vatAmount);
    inv.updatedAt = nowIso();
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function generateInvoiceNumber(db: Db): string {
  let next = 1;
  for (const inv of db.invoices) {
    const num = parseInt(inv.invoiceNumber.split("-").pop() ?? "0", 10);
    if (!isNaN(num) && num >= next) next = num + 1;
  }
  return String(next).padStart(4, "0");
}

function generateOrderNumber(db: Db): string {
  let next = 1;
  for (const inv of db.invoices) {
    if (!inv.orderNumber?.startsWith("WO-")) continue;
    const num = parseInt(inv.orderNumber.replace("WO-", ""), 10);
    if (!isNaN(num) && num >= next) next = num + 1;
  }
  return `WO-${String(next).padStart(4, "0")}`;
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function json(status: number, body: unknown): Response {
  return new Response(body == null ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
const ok = (b: unknown) => json(200, b);
const created = (b: unknown) => json(201, b);
const noContent = () => new Response(null, { status: 204 });
const badRequest = (msg = "Invalid request") => json(400, { error: msg });
const notFound = (msg = "Not found") => json(404, { error: msg });
const unauthorized = () => json(401, { error: "Unauthorized" });

async function readJson(init: RequestInit | undefined): Promise<Json> {
  if (!init?.body) return {};
  if (typeof init.body === "string") {
    try {
      return JSON.parse(init.body) as Json;
    } catch {
      return {};
    }
  }
  return {};
}

// ─── Auth ────────────────────────────────────────────────────────────────────

function isAuthed(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}
function setAuthed(v: boolean) {
  if (v) sessionStorage.setItem(AUTH_KEY, "1");
  else sessionStorage.removeItem(AUTH_KEY);
}

function configuredCode(): string {
  return (
    (import.meta.env.VITE_ACCESS_CODE as string | undefined) ??
    DEFAULT_ACCESS_CODE
  );
}

// ─── Serializers ─────────────────────────────────────────────────────────────

function serializeCustomer(c: Customer): Customer {
  return nullify({ ...c }, [
    "organizationNumber",
    "email",
    "phone",
    "address",
    "postalCode",
    "city",
    "reference",
    "notes",
  ]);
}

function serializeVehicle(v: Vehicle): Vehicle {
  return nullify({ ...v }, [
    "customerId",
    "make",
    "model",
    "year",
    "vin",
    "fuelType",
    "engineInfo",
    "mileage",
    "firstRegistrationDate",
    "notes",
  ]);
}

function serializeInvoice(inv: Invoice): Invoice {
  return { ...inv };
}

function serializeItem(it: InvoiceItem): InvoiceItem {
  return { ...it };
}

// ─── Router ──────────────────────────────────────────────────────────────────

interface RouteCtx {
  method: string;
  pathname: string;
  search: URLSearchParams;
  init?: RequestInit;
}

async function handle(ctx: RouteCtx): Promise<Response | null> {
  const { method, pathname, search } = ctx;
  const path = pathname.replace(/^\/+/, "/");

  // Auth endpoints — always accessible
  if (path === "/api/auth/me" && method === "GET") {
    return ok({ authed: isAuthed() });
  }
  if (path === "/api/auth/login" && method === "POST") {
    const body = await readJson(ctx.init);
    if (typeof body.code === "string" && body.code === configuredCode()) {
      setAuthed(true);
      return ok({ authed: true });
    }
    return unauthorized();
  }
  if (path === "/api/auth/logout" && method === "POST") {
    setAuthed(false);
    return ok({ authed: false });
  }

  if (path === "/api/healthz" && method === "GET") {
    return ok({ status: "ok" });
  }

  // All other routes require auth — match server behavior
  if (!isAuthed()) return unauthorized();

  const db = loadDb();

  // ─── Customers ─────────────────────────────────────────────────
  if (path === "/api/customers" && method === "GET") {
    const q = search.get("search")?.trim();
    let rows = db.customers.slice();
    if (q) {
      rows = rows.filter(
        (c) =>
          matches(c.name, q) ||
          matches(c.email, q) ||
          matches(c.phone, q) ||
          matches(c.organizationNumber, q),
      );
    }
    rows.sort((a, b) => a.name.localeCompare(b.name, "sv"));
    return ok(rows.map(serializeCustomer));
  }
  if (path === "/api/customers" && method === "POST") {
    const body = await readJson(ctx.init);
    if (typeof body.name !== "string" || body.name.trim() === "")
      return badRequest("name is required");
    const id = nextId(db, "customer");
    const c: Customer = {
      id,
      name: String(body.name),
      organizationNumber: (body.organizationNumber as string | null) ?? null,
      email: (body.email as string | null) ?? null,
      phone: (body.phone as string | null) ?? null,
      address: (body.address as string | null) ?? null,
      postalCode: (body.postalCode as string | null) ?? null,
      city: (body.city as string | null) ?? null,
      reference: (body.reference as string | null) ?? null,
      notes: (body.notes as string | null) ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.customers.push(c);
    saveDb(db);
    return created(serializeCustomer(c));
  }
  const customerIdMatch = path.match(/^\/api\/customers\/(\d+)$/);
  if (customerIdMatch) {
    const id = Number(customerIdMatch[1]);
    const idx = db.customers.findIndex((c) => c.id === id);
    if (method === "GET") {
      if (idx < 0) return notFound("Customer not found");
      return ok(serializeCustomer(db.customers[idx]));
    }
    if (method === "PATCH") {
      if (idx < 0) return notFound("Customer not found");
      const body = await readJson(ctx.init);
      const existing = db.customers[idx];
      const updated: Customer = {
        ...existing,
        ...(body as Partial<Customer>),
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
      };
      db.customers[idx] = updated;
      saveDb(db);
      return ok(serializeCustomer(updated));
    }
    if (method === "DELETE") {
      if (idx >= 0) {
        db.customers.splice(idx, 1);
        // null out FK references (mirrors ON DELETE SET NULL)
        for (const v of db.vehicles) if (v.customerId === id) v.customerId = null;
        for (const inv of db.invoices)
          if (inv.customerId === id) inv.customerId = null;
        saveDb(db);
      }
      return noContent();
    }
  }

  // ─── Vehicles ──────────────────────────────────────────────────
  if (path === "/api/vehicles" && method === "GET") {
    const q = search.get("search")?.trim();
    const customerId = search.get("customerId");
    let rows = db.vehicles.slice();
    if (customerId) rows = rows.filter((v) => v.customerId === Number(customerId));
    if (q) {
      rows = rows.filter(
        (v) =>
          matches(v.registrationNumber, q) ||
          matches(v.make, q) ||
          matches(v.model, q) ||
          matches(v.vin, q),
      );
    }
    rows.sort((a, b) =>
      a.registrationNumber.localeCompare(b.registrationNumber, "sv"),
    );
    return ok(rows.map(serializeVehicle));
  }
  if (path === "/api/vehicles" && method === "POST") {
    const body = await readJson(ctx.init);
    if (typeof body.registrationNumber !== "string" || body.registrationNumber.trim() === "")
      return badRequest("registrationNumber is required");
    const id = nextId(db, "vehicle");
    const v: Vehicle = {
      id,
      customerId: (body.customerId as number | null) ?? null,
      registrationNumber: String(body.registrationNumber).toUpperCase(),
      make: (body.make as string | null) ?? null,
      model: (body.model as string | null) ?? null,
      year: (body.year as number | null) ?? null,
      vin: (body.vin as string | null) ?? null,
      fuelType: (body.fuelType as string | null) ?? null,
      engineInfo: (body.engineInfo as string | null) ?? null,
      mileage: (body.mileage as number | null) ?? null,
      firstRegistrationDate: (body.firstRegistrationDate as string | null) ?? null,
      notes: (body.notes as string | null) ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.vehicles.push(v);
    saveDb(db);
    return created(serializeVehicle(v));
  }
  const vehicleIdMatch = path.match(/^\/api\/vehicles\/(\d+)$/);
  if (vehicleIdMatch) {
    const id = Number(vehicleIdMatch[1]);
    const idx = db.vehicles.findIndex((v) => v.id === id);
    if (method === "GET") {
      if (idx < 0) return notFound("Vehicle not found");
      return ok(serializeVehicle(db.vehicles[idx]));
    }
    if (method === "PATCH") {
      if (idx < 0) return notFound("Vehicle not found");
      const body = await readJson(ctx.init);
      const existing = db.vehicles[idx];
      const updated: Vehicle = {
        ...existing,
        ...(body as Partial<Vehicle>),
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
      };
      if (typeof updated.registrationNumber === "string")
        updated.registrationNumber = updated.registrationNumber.toUpperCase();
      db.vehicles[idx] = updated;
      saveDb(db);
      return ok(serializeVehicle(updated));
    }
    if (method === "DELETE") {
      if (idx >= 0) {
        db.vehicles.splice(idx, 1);
        for (const inv of db.invoices)
          if (inv.vehicleId === id) inv.vehicleId = null;
        saveDb(db);
      }
      return noContent();
    }
  }

  // ─── Invoices ──────────────────────────────────────────────────
  if (path === "/api/invoices/next-numbers" && method === "GET") {
    return ok({
      invoiceNumber: generateInvoiceNumber(db),
      orderNumber: generateOrderNumber(db),
    });
  }

  if (path === "/api/invoices" && method === "GET") {
    const q = search.get("search")?.trim();
    const status = search.get("status");
    const customerId = search.get("customerId");
    let rows = db.invoices.slice();
    if (status) rows = rows.filter((i) => i.status === status);
    if (customerId) rows = rows.filter((i) => i.customerId === Number(customerId));
    if (q) {
      rows = rows.filter(
        (i) =>
          matches(i.invoiceNumber, q) ||
          matches(i.customerName, q) ||
          matches(i.registrationNumber, q),
      );
    }
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return ok(rows.map(serializeInvoice));
  }

  if (path === "/api/invoices" && method === "POST") {
    const body = await readJson(ctx.init);
    if (typeof body.invoiceDate !== "string" || body.invoiceDate.trim() === "")
      return badRequest("invoiceDate is required");
    const id = nextId(db, "invoice");
    const inv: Invoice = {
      id,
      invoiceNumber: generateInvoiceNumber(db),
      orderNumber: generateOrderNumber(db),
      offerNumber: (body.offerNumber as string | null) ?? null,
      customerId: (body.customerId as number | null) ?? null,
      customerName: (body.customerName as string | null) ?? null,
      customerOrgNumber: (body.customerOrgNumber as string | null) ?? null,
      customerEmail: (body.customerEmail as string | null) ?? null,
      customerPhone: (body.customerPhone as string | null) ?? null,
      customerAddress: (body.customerAddress as string | null) ?? null,
      customerPostalCode: (body.customerPostalCode as string | null) ?? null,
      customerCity: (body.customerCity as string | null) ?? null,
      vehicleId: (body.vehicleId as number | null) ?? null,
      registrationNumber: (body.registrationNumber as string | null) ?? null,
      vehicleMake: (body.vehicleMake as string | null) ?? null,
      vehicleModel: (body.vehicleModel as string | null) ?? null,
      vehicleYear: (body.vehicleYear as number | null) ?? null,
      vin: (body.vin as string | null) ?? null,
      mileage: (body.mileage as number | null) ?? null,
      status: "draft",
      invoiceDate: String(body.invoiceDate),
      dueDate: (body.dueDate as string | null) ?? null,
      paymentTerms: (body.paymentTerms as string | null) ?? null,
      mechanic: (body.mechanic as string | null) ?? null,
      internalReference: (body.internalReference as string | null) ?? null,
      workshopNotes: (body.workshopNotes as string | null) ?? null,
      subtotal: 0,
      vatAmount: 0,
      total: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.invoices.push(inv);
    saveDb(db);
    return created(serializeInvoice(inv));
  }

  const invoiceStatusMatch = path.match(/^\/api\/invoices\/(\d+)\/status$/);
  if (invoiceStatusMatch && method === "PATCH") {
    const id = Number(invoiceStatusMatch[1]);
    const inv = db.invoices.find((i) => i.id === id);
    if (!inv) return notFound("Invoice not found");
    const body = await readJson(ctx.init);
    const valid = ["draft", "sent", "paid", "overdue", "cancelled"];
    if (typeof body.status !== "string" || !valid.includes(body.status))
      return badRequest("Invalid status");
    inv.status = body.status as Invoice["status"];
    inv.updatedAt = nowIso();
    saveDb(db);
    return ok(serializeInvoice(inv));
  }

  const invoiceItemsMatch = path.match(/^\/api\/invoices\/(\d+)\/items$/);
  if (invoiceItemsMatch) {
    const invoiceId = Number(invoiceItemsMatch[1]);
    if (method === "GET") {
      const items = db.invoiceItems
        .filter((i) => i.invoiceId === invoiceId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return ok(items.map(serializeItem));
    }
    if (method === "POST") {
      if (!db.invoices.find((i) => i.id === invoiceId))
        return notFound("Invoice not found");
      const body = await readJson(ctx.init);
      const qty = Number(body.quantity ?? 1);
      const price = Number(body.unitPrice ?? 0);
      const discount = Number(body.discountPercent ?? 0);
      const vat = Number(body.vatRate ?? 25);
      const net = qty * price * (1 - discount / 100);
      const lineTotal = net + net * (vat / 100);
      const item: InvoiceItem = {
        id: nextId(db, "item"),
        invoiceId,
        itemType: (body.itemType as InvoiceItem["itemType"]) ?? "part",
        articleNumber: (body.articleNumber as string | null) ?? null,
        description: String(body.description ?? ""),
        quantity: qty,
        unit: (body.unit as string | null) ?? null,
        unitPrice: price,
        discountPercent: discount,
        vatRate: vat,
        lineTotal: round2(lineTotal),
        sortOrder: Number(body.sortOrder ?? 0),
        mechanicName: (body.mechanicName as string | null) ?? null,
      };
      db.invoiceItems.push(item);
      recalcInvoice(db, invoiceId);
      saveDb(db);
      return created(serializeItem(item));
    }
  }

  const invoiceItemIdMatch = path.match(
    /^\/api\/invoices\/(\d+)\/items\/(\d+)$/,
  );
  if (invoiceItemIdMatch) {
    const invoiceId = Number(invoiceItemIdMatch[1]);
    const itemId = Number(invoiceItemIdMatch[2]);
    const idx = db.invoiceItems.findIndex(
      (i) => i.id === itemId && i.invoiceId === invoiceId,
    );
    if (method === "PATCH") {
      if (idx < 0) return notFound("Item not found");
      const body = await readJson(ctx.init);
      const existing = db.invoiceItems[idx];
      const qty = Number(body.quantity ?? existing.quantity);
      const price = Number(body.unitPrice ?? existing.unitPrice);
      const discount = Number(body.discountPercent ?? existing.discountPercent);
      const vat = Number(body.vatRate ?? existing.vatRate);
      const net = qty * price * (1 - discount / 100);
      const lineTotal = net + net * (vat / 100);
      const updated: InvoiceItem = {
        ...existing,
        ...(body as Partial<InvoiceItem>),
        id: existing.id,
        invoiceId: existing.invoiceId,
        quantity: qty,
        unitPrice: price,
        discountPercent: discount,
        vatRate: vat,
        lineTotal: round2(lineTotal),
      };
      db.invoiceItems[idx] = updated;
      recalcInvoice(db, invoiceId);
      saveDb(db);
      return ok(serializeItem(updated));
    }
    if (method === "DELETE") {
      if (idx >= 0) {
        db.invoiceItems.splice(idx, 1);
        recalcInvoice(db, invoiceId);
        saveDb(db);
      }
      return noContent();
    }
  }

  const invoiceIdMatch = path.match(/^\/api\/invoices\/(\d+)$/);
  if (invoiceIdMatch) {
    const id = Number(invoiceIdMatch[1]);
    const idx = db.invoices.findIndex((i) => i.id === id);
    if (method === "GET") {
      if (idx < 0) return notFound("Invoice not found");
      const inv = db.invoices[idx];
      const items = db.invoiceItems
        .filter((i) => i.invoiceId === id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return ok({ ...serializeInvoice(inv), items: items.map(serializeItem) });
    }
    if (method === "PATCH") {
      if (idx < 0) return notFound("Invoice not found");
      const body = await readJson(ctx.init);
      const existing = db.invoices[idx];
      const updated: Invoice = {
        ...existing,
        ...(body as Partial<Invoice>),
        id: existing.id,
        invoiceNumber: existing.invoiceNumber,
        status: existing.status,
        subtotal: existing.subtotal,
        vatAmount: existing.vatAmount,
        total: existing.total,
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
      };
      db.invoices[idx] = updated;
      saveDb(db);
      const items = db.invoiceItems
        .filter((i) => i.invoiceId === id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return ok({
        ...serializeInvoice(updated),
        items: items.map(serializeItem),
      });
    }
    if (method === "DELETE") {
      if (idx >= 0) {
        db.invoices.splice(idx, 1);
        db.invoiceItems = db.invoiceItems.filter((i) => i.invoiceId !== id);
        saveDb(db);
      }
      return noContent();
    }
  }

  // ─── Dashboard ─────────────────────────────────────────────────
  if (path === "/api/dashboard/stats" && method === "GET") {
    const statusMap: Record<string, number> = {};
    let totalRevenue = 0;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let monthlyRevenue = 0;
    for (const inv of db.invoices) {
      statusMap[inv.status] = (statusMap[inv.status] ?? 0) + 1;
      if (inv.status === "paid") {
        totalRevenue += inv.total;
        if (new Date(inv.createdAt).getTime() >= firstOfMonth) {
          monthlyRevenue += inv.total;
        }
      }
    }
    return ok({
      totalCustomers: db.customers.length,
      totalVehicles: db.vehicles.length,
      totalInvoices: db.invoices.length,
      totalRevenue: round2(totalRevenue),
      draftCount: statusMap.draft ?? 0,
      sentCount: statusMap.sent ?? 0,
      paidCount: statusMap.paid ?? 0,
      overdueCount: statusMap.overdue ?? 0,
      monthlyRevenue: round2(monthlyRevenue),
    });
  }

  if (path === "/api/dashboard/recent-invoices" && method === "GET") {
    const limit = Math.min(Number(search.get("limit") ?? 10) || 10, 50);
    const rows = db.invoices
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
    return ok(rows.map(serializeInvoice));
  }

  if (path === "/api/dashboard/revenue-by-month" && method === "GET") {
    const buckets = new Map<
      string,
      { year: number; month: number; revenue: number; invoiceCount: number }
    >();
    for (const inv of db.invoices) {
      const d = new Date(inv.createdAt);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${month}`;
      const b = buckets.get(key) ?? {
        year,
        month,
        revenue: 0,
        invoiceCount: 0,
      };
      b.invoiceCount += 1;
      if (inv.status === "paid") b.revenue += inv.total;
      buckets.set(key, b);
    }
    const rows = Array.from(buckets.values()).sort(
      (a, b) => a.year - b.year || a.month - b.month,
    );
    return ok(rows.map((r) => ({ ...r, revenue: round2(r.revenue) })));
  }

  return null; // not an /api/* route we know
}

// ─── Install global fetch interceptor ────────────────────────────────────────

export function installLocalApi() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url: URL;
    let method = (init?.method ?? "GET").toUpperCase();
    let resolvedInit: RequestInit | undefined = init;

    try {
      if (typeof input === "string") {
        url = new URL(input, window.location.origin);
      } else if (input instanceof URL) {
        url = input;
      } else {
        url = new URL(input.url, window.location.origin);
        method = (init?.method ?? input.method ?? "GET").toUpperCase();
        if (!init?.body) {
          try {
            const text = await input.clone().text();
            resolvedInit = { ...init, method, body: text };
          } catch {
            resolvedInit = init;
          }
        }
      }
    } catch {
      return originalFetch(input as RequestInfo, init);
    }

    // Match /api/... anywhere in the path (handles base path prefixes)
    const apiIdx = url.pathname.indexOf("/api/");
    if (apiIdx < 0 && !url.pathname.endsWith("/api")) {
      return originalFetch(input as RequestInfo, init);
    }
    const apiPath = apiIdx >= 0 ? url.pathname.slice(apiIdx) : "/api";

    const response = await handle({
      method,
      pathname: apiPath,
      search: url.searchParams,
      init: resolvedInit,
    });

    if (response) return response;
    return originalFetch(input as RequestInfo, init);
  };
}
