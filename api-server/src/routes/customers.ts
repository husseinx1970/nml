import { Router } from "express";
import { db, customersTable } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import { ListCustomersQueryParams, CreateCustomerBody, UpdateCustomerBody } from "@workspace/api-zod";

const router = Router();

function likeLower(col: ReturnType<typeof sql.raw> | unknown, value: string) {
  const v = `%${value.toLowerCase()}%`;
  return sql`lower(${col}) like ${v}`;
}

router.get("/", async (req, res) => {
  try {
    const query = ListCustomersQueryParams.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    const { search } = query.data;

    let customers;
    if (search) {
      customers = await db
        .select()
        .from(customersTable)
        .where(
          or(
            likeLower(customersTable.name, search),
            likeLower(customersTable.email, search),
            likeLower(customersTable.phone, search),
          ),
        )
        .orderBy(customersTable.name);
    } else {
      customers = await db.select().from(customersTable).orderBy(customersTable.name);
    }

    return res.json(customers.map(serializeCustomer));
  } catch (err) {
    req.log.error({ err }, "Failed to list customers");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateCustomerBody.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const [customer] = await db.insert(customersTable).values(body.data).returning();
    return res.status(201).json(serializeCustomer(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to create customer");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    return res.json(serializeCustomer(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to get customer");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const body = UpdateCustomerBody.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const [customer] = await db
      .update(customersTable)
      .set(body.data)
      .where(eq(customersTable.id, id))
      .returning();

    if (!customer) return res.status(404).json({ error: "Customer not found" });
    return res.json(serializeCustomer(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await db.delete(customersTable).where(eq(customersTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    return res.status(500).json({ error: "Internal server error" });
  }
});

function serializeCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    organizationNumber: c.organizationNumber,
    email: c.email,
    phone: c.phone,
    address: c.address,
    postalCode: c.postalCode,
    city: c.city,
    reference: c.reference,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export default router;
