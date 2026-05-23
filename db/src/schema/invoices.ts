import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { vehiclesTable } from "./vehicles";

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
export const ITEM_TYPES = ["part", "labor", "oil", "tire_fee", "environmental_fee", "diagnostic", "fixed_price", "discount", "other"] as const;

export const invoicesTable = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull(),
  orderNumber: text("order_number"),
  offerNumber: text("offer_number"),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
  customerName: text("customer_name"),
  customerOrgNumber: text("customer_org_number"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerPostalCode: text("customer_postal_code"),
  customerCity: text("customer_city"),
  vehicleId: integer("vehicle_id").references(() => vehiclesTable.id, { onDelete: "set null" }),
  registrationNumber: text("registration_number"),
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  vehicleYear: integer("vehicle_year"),
  vin: text("vin"),
  mileage: integer("mileage"),
  status: text("status", { enum: INVOICE_STATUSES }).notNull().default("draft"),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date"),
  paymentTerms: text("payment_terms"),
  mechanic: text("mechanic"),
  internalReference: text("internal_reference"),
  workshopNotes: text("workshop_notes"),
  subtotal: real("subtotal").notNull().default(0),
  vatAmount: real("vat_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
});

export const invoiceItemsTable = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  itemType: text("item_type", { enum: ITEM_TYPES }).notNull().default("part"),
  articleNumber: text("article_number"),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit"),
  unitPrice: real("unit_price").notNull().default(0),
  discountPercent: real("discount_percent").notNull().default(0),
  vatRate: real("vat_rate").notNull().default(25),
  lineTotal: real("line_total").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  mechanicName: text("mechanic_name"),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItemsTable).omit({ id: true });

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
