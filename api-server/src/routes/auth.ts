import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    authed?: boolean;
  }
}

const ACCESS_CODE = process.env["ACCESS_CODE"] ?? "19701970hasan";

const router: IRouter = Router();

router.get("/me", (req: Request, res: Response) => {
  res.json({ authed: req.session?.authed === true });
});

router.post("/login", (req: Request, res: Response) => {
  const code = String((req.body as { code?: unknown })?.code ?? "");
  if (code !== ACCESS_CODE) {
    req.log.warn("Failed login attempt");
    res.status(401).json({ error: "Felaktig kod" });
    return;
  }
  if (!req.session) {
    res.status(500).json({ error: "Session unavailable" });
    return;
  }
  req.session.authed = true;
  req.session.save((err) => {
    if (err) {
      req.log.error({ err }, "Session save failed");
      res.status(500).json({ error: "Session save failed" });
      return;
    }
    res.json({ authed: true });
  });
});

router.post("/logout", (req: Request, res: Response) => {
  if (!req.session) {
    res.json({ authed: false });
    return;
  }
  req.session.destroy(() => {
    res.clearCookie("utby.sid");
    res.json({ authed: false });
  });
});

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.authed === true) {
    next();
    return;
  }
  res.status(401).json({ error: "Ej inloggad" });
}

export default router;
