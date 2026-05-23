import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const vehiclesTable = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
  registrationNumber: text("registration_number").notNull(),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  vin: text("vin"),
  fuelType: text("fuel_type"),
  engineInfo: text("engine_info"),
  mileage: integer("mileage"),
  firstRegistrationDate: text("first_registration_date"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;
