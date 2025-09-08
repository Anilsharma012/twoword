import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { getDatabase } from "../db/mongodb";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const UpdateSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().trim(),
  autoAds: z.boolean().optional(),
  testMode: z.boolean().optional(),
  slots: z
    .object({
      header: z.object({ enabled: z.boolean(), slotId: z.string().optional() }).optional(),
      belowHero: z.object({ enabled: z.boolean(), slotId: z.string().optional() }).optional(),
      inArticle: z.object({ enabled: z.boolean(), slotId: z.string().optional() }).optional(),
      sidebar: z.object({ enabled: z.boolean(), slotId: z.string().optional() }).optional(),
    })
    .partial()
    .optional(),
  noAdsRoutes: z.array(z.string()).optional(),
});

const DEFAULT_DOC = {
  enabled: false,
  clientId: "",
  autoAds: false,
  testMode: true,
  slots: {
    header: { enabled: false, slotId: "" },
    belowHero: { enabled: false, slotId: "" },
    inArticle: { enabled: true, slotId: "" },
    sidebar: { enabled: false, slotId: "" },
  },
  noAdsRoutes: ["/login", "/checkout"],
};

const router = Router();

// PUBLIC: minimal config for frontend
router.get("/public/ads", (async (_req, res) => {
  try {
    const db = getDatabase();
    const s = (await db.collection("ad_settings").findOne({})) || DEFAULT_DOC;
    return res.json({
      enabled: !!s.enabled,
      clientId: s.clientId || "",
      autoAds: !!s.autoAds,
      testMode: !!s.testMode,
      slots: s.slots || DEFAULT_DOC.slots,
      noAdsRoutes: s.noAdsRoutes || [],
    });
  } catch (e) {
    return res.json({ ...DEFAULT_DOC });
  }
}) as RequestHandler);

// ADMIN: read
router.get("/admin/ads", authenticateToken, requireAdmin, (async (_req, res) => {
  try {
    const db = getDatabase();
    const s = (await db.collection("ad_settings").findOne({})) || DEFAULT_DOC;
    res.json(s);
  } catch (e) {
    res.json(DEFAULT_DOC);
  }
}) as RequestHandler);

// ADMIN: upsert
router.put("/admin/ads", authenticateToken, requireAdmin, (async (req: any, res) => {
  try {
    const body = UpdateSchema.parse(req.body);
    const db = getDatabase();
    await db.collection("ad_settings").updateOne({}, { $set: { ...body, updatedAt: new Date() } }, { upsert: true });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "Invalid payload" });
  }
}) as RequestHandler);

export default router;
