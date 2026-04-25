// @ts-nocheck
import { Express } from "express";
import { db } from "../db";
import { eq, and, desc, or, isNull, sql } from "drizzle-orm";
import { 
  principalMaster, principalProgram, principalTier, 
  principalSubscription, rewardClaim,
  insertPrincipalMasterSchema, insertPrincipalProgramSchema, 
  insertPrincipalTierSchema, insertPrincipalSubscriptionSchema 
} from "@shared/schema";
import { requireAuth, requirePermission } from "../auth";
import { getEffectiveBranch } from "./utils";
import { log } from "../logger";

export function registerPrincipalRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Masters
  app.get("/api/promo/masters/principal", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const conditions = [];
      if (bId) conditions.push(eq(principalMaster.branchId, bId));
      res.json(await db.select().from(principalMaster).where(conditions.length > 0 ? and(...conditions) : undefined));
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/principal: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters/principal", requireAuth, requirePermission(["promo_toko", "master_principal"], "input"), async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const data = insertPrincipalMasterSchema.parse({ ...req.body, branchId: bId as number });
      const [principal] = await db.insert(principalMaster).values({ 
        ...data, 
        branchId: data.branchId || bId || 0,
        status: (data.status || 'aktif') as any 
      }).returning();
      broadcast("/api/promo/masters/principal");
      res.status(201).json(principal);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/principal: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  app.patch("/api/promo/masters/principal/:id", requireAuth, requirePermission(["promo_toko", "master_principal"], "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const data = insertPrincipalMasterSchema.partial().parse(req.body);
      const [principal] = await db.update(principalMaster).set({ 
        ...data, 
        updatedAt: new Date() 
      } as any).where(eq(principalMaster.id, id)).returning();
      broadcast("/api/promo/masters/principal");
      res.json(principal);
    } catch (err: any) {
      log(`Error in PATCH /api/promo/masters/principal/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  app.delete("/api/promo/masters/principal/:id", requireAuth, requirePermission(["promo_toko", "master_principal"], "delete"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      await db.delete(principalMaster).where(eq(principalMaster.id, id));
      broadcast("/api/promo/masters/principal");
      res.json({ success: true });
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/principal/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 2. Programs
  app.get("/api/promo/masters/principal-program", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const brand = req.query.brandCode as string;
      
      const conditions = [];
      if (bId) conditions.push(eq(principalProgram.branchId, bId));
      if (brand && brand !== 'SEMUA') conditions.push(eq(principalProgram.brandCode, brand));
      
      const results = await db.query.principalProgram.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          principal: true,
          tiers: true
        },
        orderBy: [desc(principalProgram.createdAt)]
      });
      
      res.json(results);
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/principal-program: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters/principal-program", requireAuth, requirePermission(["promo_toko", "master_promo_principal"], "input"), async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const { tiers, ...progData } = req.body;
      
      const data = insertPrincipalProgramSchema.parse({ ...progData, branchId: bId as number });
      
      const result = await db.transaction(async (tx) => {
        const [prog] = await tx.insert(principalProgram).values({ 
          ...data, 
          branchId: (data.branchId || bId || 0) as number,
          status: (data.status || 'aktif') as any,
          basisType: data.basisType as any,
          acuanTanggal: (data.acuanTanggal || 'faktur') as any
        }).returning();

        if (tiers && Array.isArray(tiers)) {
          const tierValues = tiers.map((t: any) => {
            const parsed = insertPrincipalTierSchema.parse(t);
            return {
              ...parsed,
              programId: prog.id,
              branchId: (data.branchId || bId || 0) as number,
              rewardPerusahaanType: parsed.rewardPerusahaanType as any,
              rewardPrincipalType: parsed.rewardPrincipalType as any
            };
          });
          if (tierValues.length > 0) await tx.insert(principalTier).values(tierValues);
        }
        return prog;
      });

      broadcast("/api/promo/masters/principal-program");
      res.status(201).json(result);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/principal-program: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  app.put("/api/promo/masters/principal-program/:id", requireAuth, requirePermission(["promo_toko", "master_promo_principal"], "edit"), async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const id = parseInt(String(req.params.id));
      const { tiers, ...progData } = req.body;
      
      const data = insertPrincipalProgramSchema.parse({ ...progData, branchId: bId as number });
      
      const result = await db.transaction(async (tx) => {
        const [prog] = await tx.update(principalProgram).set({ 
          ...data, 
          updatedAt: new Date(),
          status: (data.status || 'aktif') as any,
          basisType: data.basisType as any,
          acuanTanggal: (data.acuanTanggal || 'faktur') as any,
          branchId: (data.branchId || bId || 0) as number
        } as any).where(eq(principalProgram.id, id)).returning();

        // Refresh Tiers
        await tx.delete(principalTier).where(eq(principalTier.programId, id));
        if (tiers && Array.isArray(tiers)) {
          const tierValues = tiers.map((t: any) => {
            const parsed = insertPrincipalTierSchema.parse(t);
            return {
              ...parsed,
              programId: id,
              branchId: (data.branchId || bId || 0) as number,
              rewardPerusahaanType: parsed.rewardPerusahaanType as any,
              rewardPrincipalType: parsed.rewardPrincipalType as any
            };
          });
          if (tierValues.length > 0) await tx.insert(principalTier).values(tierValues);
        }
        return prog;
      });

      broadcast("/api/promo/masters/principal-program");
      res.json(result);
    } catch (err: any) {
      log(`Error in PUT /api/promo/masters/principal-program/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  app.delete("/api/promo/masters/principal-program/:id", requireAuth, requirePermission(["promo_toko", "master_promo_principal"], "delete"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      await db.delete(principalProgram).where(eq(principalProgram.id, id));
      broadcast("/api/promo/masters/principal-program");
      res.json({ success: true });
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/principal-program/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 3. Tiers & Subscriptions
  app.get("/api/promo/programs/principal/subscriptions", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const conditions = [];
      if (bId) conditions.push(eq(principalSubscription.branchId, bId));
      res.json(await db.select().from(principalSubscription).where(conditions.length > 0 ? and(...conditions) : undefined));
    } catch (err: any) {
      log(`Error in GET /api/promo/programs/principal/subscriptions: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/programs/principal/subscriptions", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const data = insertPrincipalSubscriptionSchema.parse({ ...req.body, branchId: bId as number });
      const [sub] = await db.insert(principalSubscription).values({ 
        ...data, 
        branchId: data.branchId || bId || 0,
        status: (data.status || 'aktif') as any 
      }).returning();
      res.status(201).json(sub);
    } catch (err: any) {
      log(`Error in POST /api/promo/programs/principal/subscriptions: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  app.get("/api/promo/programs/principal/:progId/tiers", requireAuth, async (req, res) => {
    try {
      res.json(await db.select().from(principalTier).where(eq(principalTier.programId, Number(String(req.params.progId)))));
    } catch (err: any) {
      log(`Error in GET /api/promo/programs/principal/${req.params.progId}/tiers: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/programs/principal/:progId/tiers", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const data = insertPrincipalTierSchema.parse({ ...req.body, programId: Number(String(req.params.progId)), branchId: bId as number });
      const [tier] = await db.insert(principalTier).values({ 
        ...data, 
        branchId: data.branchId || bId || 0,
        rewardPerusahaanType: data.rewardPerusahaanType as any,
        rewardPrincipalType: data.rewardPrincipalType as any 
      }).returning();
      res.status(201).json(tier);
    } catch (err: any) {
      log(`Error in POST /api/promo/programs/principal/${req.params.progId}/tiers: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });
}
