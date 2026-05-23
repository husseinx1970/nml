import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import vehiclesRouter from "./vehicles";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";
import authRouter, { requireAuth } from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

// All routes below this point require authentication
router.use(requireAuth);
router.use("/customers", customersRouter);
router.use("/vehicles", vehiclesRouter);
router.use("/invoices", invoicesRouter);
router.use("/dashboard", dashboardRouter);

export default router;
