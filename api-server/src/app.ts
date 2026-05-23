import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const isProd = process.env["NODE_ENV"] === "production";

app.use(
  session({
    name: "utby.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  }),
);

app.use("/api", router);

// ── Static frontend (production) ──────────────────────────────────────────────
// In production, the API server also serves the built frontend.
// Set FRONTEND_DIST to override (default: ../../workshop/dist/public relative to this file).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultFrontendDist = path.resolve(__dirname, "../../workshop/dist/public");
const frontendDist = process.env["FRONTEND_DIST"]
  ? path.resolve(process.env["FRONTEND_DIST"])
  : defaultFrontendDist;

if (existsSync(frontendDist)) {
  logger.info({ frontendDist }, "Serving static frontend");
  app.use(express.static(frontendDist, { index: false, maxAge: "1h" }));
  // SPA fallback — send index.html for any non-API GET request
  app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  logger.info({ frontendDist }, "Frontend dist not found — running API-only");
}

export default app;
