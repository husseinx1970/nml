import { Router } from "express";
import { db, customersTable, vehiclesTable, invoicesTable } from "@workspace/db";
import { eq, sql, desc, gte, and } from "drizzle-orm";
import { GetRecentInvoicesQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const [customersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customersTable);

    const [vehiclesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vehiclesTable);

    const [invoicesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoicesTable);

    const statusCounts = await db
      .select({
        status: invoicesTable.status,
        count: sql<number>`count(*)`,
      })
      .from(invoicesTable)
      .groupBy(invoicesTable.status);

    const [revenueResult] = await db
      .select({ total: sql<number>`coalesce(sum(total), 0)` })
      .from(invoicesTable)
      .where(eq(invoicesTable.status, "paid"));

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthlyResult] = await db
      .select({ total: sql<number>`coalesce(sum(total), 0)` })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.status, "paid"),
          gte(invoicesTable.createdAt, firstDayOfMonth),
        ),
      );

    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) {
      statusMap[row.status] = Number(row.count);
    }

    return res.json({
      totalCustomers: Number(customersCount?.count ?? 0),
      totalVehicles: Number(vehiclesCount?.count ?? 0),
      totalInvoices: Number(invoicesCount?.count ?? 0),
      totalRevenue: Number(revenueResult?.total ?? 0),
      draftCount: statusMap["draft"] ?? 0,
      sentCount: statusMap["sent"] ?? 0,
      paidCount: statusMap["paid"] ?? 0,
      overdueCount: statusMap["overdue"] ?? 0,
      monthlyRevenue: Number(monthlyResult?.total ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recent-invoices", async (req, res) => {
  try {
    const query = GetRecentInvoicesQueryParams.safeParse(req.query);
    const limit = Math.min(query.success ? (query.data.limit ?? 10) : 10, 50);

    const invoices = await db
      .select()
      .from(invoicesTable)
      .orderBy(desc(invoicesTable.createdAt))
      .limit(limit);

    return res.json(
      invoices.map((inv) => ({
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
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get recent invoices");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/revenue-by-month", async (req, res) => {
  try {
    const rows = await db
      .select({
        month: sql<string>`strftime('%m', created_at, 'unixepoch')`,
        year: sql<string>`strftime('%Y', created_at, 'unixepoch')`,
        revenue: sql<number>`coalesce(sum(case when status = 'paid' then total else 0 end), 0)`,
        invoiceCount: sql<number>`count(*)`,
      })
      .from(invoicesTable)
      .groupBy(
        sql`strftime('%Y', created_at, 'unixepoch')`,
        sql`strftime('%m', created_at, 'unixepoch')`,
      )
      .orderBy(
        sql`strftime('%Y', created_at, 'unixepoch')`,
        sql`strftime('%m', created_at, 'unixepoch')`,
      );

    return res.json(
      rows.map((r) => ({
        month: Number(r.month),
        year: Number(r.year),
        revenue: Number(r.revenue),
        invoiceCount: Number(r.invoiceCount),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get revenue by month");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
