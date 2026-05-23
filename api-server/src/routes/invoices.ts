import { Router } from "express";
import { db, invoicesTable, invoiceItemsTable } from "@workspace/db";
import { eq, or, and, desc, sql, like } from "drizzle-orm";
import {
  ListInvoicesQueryParams,
  CreateInvoiceBody,
  UpdateInvoiceBody,
  UpdateInvoiceStatusBody,
  CreateInvoiceItemBody,
  UpdateInvoiceItemBody,
} from "@workspace/api-zod";

const router = Router();

function likeLower(col: unknown, value: string) {
  const v = `%${value.toLowerCase()}%`;
  return sql`lower(${col}) like ${v}`;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function serializeInvoice(inv: typeof invoicesTable.$inferSelect) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    orderNumber: inv.orderNumber,
    offerNumber: inv.offerNumber,
    customerId: inv.customerId,
    customerName: inv.customerName,
    customerOrgNumber: inv.customerOrgNumber,
    customerEmail: inv.customerEmail,
    customerPhone: inv.customerPhone,
    customerAddress: inv.customerAddress,
    customerPostalCode: inv.customerPostalCode,
    customerCity: inv.customerCity,
    vehicleId: inv.vehicleId,
    registrationNumber: inv.registrationNumber,
    vehicleMake: inv.vehicleMake,
    vehicleModel: inv.vehicleModel,
    vehicleYear: inv.vehicleYear,
    vin: inv.vin,
    mileage: inv.mileage,
    status: inv.status,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    paymentTerms: inv.paymentTerms,
    mechanic: inv.mechanic,
    internalReference: inv.internalReference,
    workshopNotes: inv.workshopNotes,
    subtotal: Number(inv.subtotal ?? 0),
    vatAmount: Number(inv.vatAmount ?? 0),
    total: Number(inv.total ?? 0),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

function serializeItem(item: typeof invoiceItemsTable.$inferSelect) {
  return {
    id: item.id,
    invoiceId: item.invoiceId,
    itemType: item.itemType,
    articleNumber: item.articleNumber,
    description: item.description,
    quantity: Number(item.quantity ?? 1),
    unit: item.unit,
    unitPrice: Number(item.unitPrice ?? 0),
    discountPercent: Number(item.discountPercent ?? 0),
    vatRate: Number(item.vatRate ?? 25),
    lineTotal: Number(item.lineTotal ?? 0),
    sortOrder: item.sortOrder,
    mechanicName: item.mechanicName,
  };
}

async function recalculateInvoiceTotals(invoiceId: number) {
  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoiceId));

  let subtotal = 0;
  let vatAmount = 0;

  for (const item of items) {
    const qty = Number(item.quantity ?? 1);
    const price = Number(item.unitPrice ?? 0);
    const discount = Number(item.discountPercent ?? 0);
    const vatRate = Number(item.vatRate ?? 25);

    const discountedPrice = price * (1 - discount / 100);
    const net = qty * discountedPrice;
    const vat = net * (vatRate / 100);

    subtotal += net;
    vatAmount += vat;
  }

  const total = subtotal + vatAmount;

  await db
    .update(invoicesTable)
    .set({
      subtotal: Number(subtotal.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
    })
    .where(eq(invoicesTable.id, invoiceId));
}

async function generateInvoiceNumber(): Promise<string> {
  const result = await db
    .select({ maxNum: sql<string>`max(invoice_number)` })
    .from(invoicesTable);
  const maxStr = result[0]?.maxNum ?? null;
  let next = 1;
  if (maxStr) {
    const parts = maxStr.split("-");
    const numPart = parts[parts.length - 1];
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) next = parsed + 1;
  }
  return String(next).padStart(4, "0");
}

async function generateOrderNumber(): Promise<string> {
  const result = await db
    .select({ maxNum: sql<string>`max(order_number)` })
    .from(invoicesTable)
    .where(like(invoicesTable.orderNumber, "WO-%"));
  const maxStr = result[0]?.maxNum ?? null;
  let next = 1;
  if (maxStr) {
    const parsed = parseInt(maxStr.replace("WO-", ""), 10);
    if (!isNaN(parsed)) next = parsed + 1;
  }
  return `WO-${String(next).padStart(4, "0")}`;
}

// ─── INVOICE ROUTES ───────────────────────────────────────────────────────────

router.get("/next-numbers", async (req, res) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    const orderNumber = await generateOrderNumber();
    return res.json({ invoiceNumber, orderNumber });
  } catch (err) {
    req.log.error({ err }, "Failed to generate next numbers");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const query = ListInvoicesQueryParams.safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: "Invalid query" });

    const { search, status, customerId } = query.data;
    const conditions = [];

    if (status) conditions.push(eq(invoicesTable.status, status as any));
    if (customerId) conditions.push(eq(invoicesTable.customerId, customerId));
    if (search) {
      conditions.push(
        or(
          likeLower(invoicesTable.invoiceNumber, search),
          likeLower(invoicesTable.customerName, search),
          likeLower(invoicesTable.registrationNumber, search),
        ),
      );
    }

    const invoices =
      conditions.length > 0
        ? await db
            .select()
            .from(invoicesTable)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(desc(invoicesTable.createdAt))
        : await db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt));

    return res.json(invoices.map(serializeInvoice));
  } catch (err) {
    req.log.error({ err }, "Failed to list invoices");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateInvoiceBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid request body" });

    const invoiceNumber = await generateInvoiceNumber();
    const orderNumber = await generateOrderNumber();
    const [invoice] = await db
      .insert(invoicesTable)
      .values({ ...body.data, invoiceNumber, orderNumber })
      .returning();

    return res.status(201).json(serializeInvoice(invoice));
  } catch (err) {
    req.log.error({ err }, "Failed to create invoice");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id));

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const items = await db
      .select()
      .from(invoiceItemsTable)
      .where(eq(invoiceItemsTable.invoiceId, id))
      .orderBy(invoiceItemsTable.sortOrder);

    return res.json({
      ...serializeInvoice(invoice),
      items: items.map(serializeItem),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get invoice");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const body = UpdateInvoiceBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid request body" });

    const [invoice] = await db
      .update(invoicesTable)
      .set(body.data)
      .where(eq(invoicesTable.id, id))
      .returning();

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const items = await db
      .select()
      .from(invoiceItemsTable)
      .where(eq(invoiceItemsTable.invoiceId, id))
      .orderBy(invoiceItemsTable.sortOrder);

    return res.json({ ...serializeInvoice(invoice), items: items.map(serializeItem) });
  } catch (err) {
    req.log.error({ err }, "Failed to update invoice");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete invoice");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const body = UpdateInvoiceStatusBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid request body" });

    const [invoice] = await db
      .update(invoicesTable)
      .set({ status: body.data.status as any })
      .where(eq(invoicesTable.id, id))
      .returning();

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    return res.json(serializeInvoice(invoice));
  } catch (err) {
    req.log.error({ err }, "Failed to update invoice status");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── INVOICE ITEMS ────────────────────────────────────────────────────────────

router.get("/:invoiceId/items", async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.invoiceId);
    if (isNaN(invoiceId)) return res.status(400).json({ error: "Invalid invoice ID" });

    const items = await db
      .select()
      .from(invoiceItemsTable)
      .where(eq(invoiceItemsTable.invoiceId, invoiceId))
      .orderBy(invoiceItemsTable.sortOrder);

    return res.json(items.map(serializeItem));
  } catch (err) {
    req.log.error({ err }, "Failed to list invoice items");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:invoiceId/items", async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.invoiceId);
    if (isNaN(invoiceId)) return res.status(400).json({ error: "Invalid invoice ID" });

    const body = CreateInvoiceItemBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid request body" });

    const { quantity, unitPrice, discountPercent, vatRate, ...rest } = body.data;
    const qty = Number(quantity ?? 1);
    const price = Number(unitPrice ?? 0);
    const discount = Number(discountPercent ?? 0);
    const vat = Number(vatRate ?? 25);
    const net = qty * price * (1 - discount / 100);
    const lineTotal = net + net * (vat / 100);

    const [item] = await db
      .insert(invoiceItemsTable)
      .values({
        invoiceId,
        quantity: qty,
        unitPrice: price,
        discountPercent: discount,
        vatRate: vat,
        lineTotal: Number(lineTotal.toFixed(2)),
        ...rest,
      })
      .returning();

    await recalculateInvoiceTotals(invoiceId);
    return res.status(201).json(serializeItem(item));
  } catch (err) {
    req.log.error({ err }, "Failed to create invoice item");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:invoiceId/items/:itemId", async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.invoiceId);
    const itemId = parseInt(req.params.itemId);
    if (isNaN(invoiceId) || isNaN(itemId)) return res.status(400).json({ error: "Invalid ID" });

    const body = UpdateInvoiceItemBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid request body" });

    const [existing] = await db
      .select()
      .from(invoiceItemsTable)
      .where(and(eq(invoiceItemsTable.id, itemId), eq(invoiceItemsTable.invoiceId, invoiceId)));

    if (!existing) return res.status(404).json({ error: "Item not found" });

    const qty = Number(body.data.quantity ?? existing.quantity ?? 1);
    const price = Number(body.data.unitPrice ?? existing.unitPrice ?? 0);
    const discount = Number(body.data.discountPercent ?? existing.discountPercent ?? 0);
    const vat = Number(body.data.vatRate ?? existing.vatRate ?? 25);
    const net = qty * price * (1 - discount / 100);
    const lineTotal = net + net * (vat / 100);

    const updateData: Record<string, unknown> = {};
    if (body.data.itemType !== undefined) updateData.itemType = body.data.itemType;
    if (body.data.articleNumber !== undefined) updateData.articleNumber = body.data.articleNumber;
    if (body.data.description !== undefined) updateData.description = body.data.description;
    if (body.data.unit !== undefined) updateData.unit = body.data.unit;
    if (body.data.sortOrder !== undefined) updateData.sortOrder = body.data.sortOrder;
    if (body.data.mechanicName !== undefined) updateData.mechanicName = body.data.mechanicName;
    updateData.quantity = qty;
    updateData.unitPrice = price;
    updateData.discountPercent = discount;
    updateData.vatRate = vat;
    updateData.lineTotal = Number(lineTotal.toFixed(2));

    const [item] = await db
      .update(invoiceItemsTable)
      .set(updateData as any)
      .where(eq(invoiceItemsTable.id, itemId))
      .returning();

    await recalculateInvoiceTotals(invoiceId);
    return res.json(serializeItem(item));
  } catch (err) {
    req.log.error({ err }, "Failed to update invoice item");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:invoiceId/items/:itemId", async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.invoiceId);
    const itemId = parseInt(req.params.itemId);
    if (isNaN(invoiceId) || isNaN(itemId)) return res.status(400).json({ error: "Invalid ID" });

    await db
      .delete(invoiceItemsTable)
      .where(and(eq(invoiceItemsTable.id, itemId), eq(invoiceItemsTable.invoiceId, invoiceId)));

    await recalculateInvoiceTotals(invoiceId);
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete invoice item");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
