import { Router } from "express";
import { db, vehiclesTable } from "@workspace/db";
import { eq, or, and, sql } from "drizzle-orm";
import { ListVehiclesQueryParams, CreateVehicleBody, UpdateVehicleBody } from "@workspace/api-zod";

const router = Router();

function likeLower(col: unknown, value: string) {
  const v = `%${value.toLowerCase()}%`;
  return sql`lower(${col}) like ${v}`;
}

router.get("/", async (req, res) => {
  try {
    const query = ListVehiclesQueryParams.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    const { search, customerId } = query.data;

    const conditions = [];
    if (customerId) {
      conditions.push(eq(vehiclesTable.customerId, customerId));
    }
    if (search) {
      conditions.push(
        or(
          likeLower(vehiclesTable.registrationNumber, search),
          likeLower(vehiclesTable.make, search),
          likeLower(vehiclesTable.model, search),
        ),
      );
    }

    const vehicles =
      conditions.length > 0
        ? await db
            .select()
            .from(vehiclesTable)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(vehiclesTable.registrationNumber)
        : await db.select().from(vehiclesTable).orderBy(vehiclesTable.registrationNumber);

    return res.json(vehicles.map(serializeVehicle));
  } catch (err) {
    req.log.error({ err }, "Failed to list vehicles");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateVehicleBody.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const [vehicle] = await db.insert(vehiclesTable).values(body.data).returning();
    return res.status(201).json(serializeVehicle(vehicle));
  } catch (err) {
    req.log.error({ err }, "Failed to create vehicle");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id));
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    return res.json(serializeVehicle(vehicle));
  } catch (err) {
    req.log.error({ err }, "Failed to get vehicle");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const body = UpdateVehicleBody.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const [vehicle] = await db
      .update(vehiclesTable)
      .set(body.data)
      .where(eq(vehiclesTable.id, id))
      .returning();

    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    return res.json(serializeVehicle(vehicle));
  } catch (err) {
    req.log.error({ err }, "Failed to update vehicle");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await db.delete(vehiclesTable).where(eq(vehiclesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete vehicle");
    return res.status(500).json({ error: "Internal server error" });
  }
});

function serializeVehicle(v: typeof vehiclesTable.$inferSelect) {
  return {
    id: v.id,
    customerId: v.customerId,
    registrationNumber: v.registrationNumber,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: v.vin,
    fuelType: v.fuelType,
    engineInfo: v.engineInfo,
    mileage: v.mileage,
    firstRegistrationDate: v.firstRegistrationDate,
    notes: v.notes,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export default router;
