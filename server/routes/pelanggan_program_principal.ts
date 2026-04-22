import { Express } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { pelangganProgramPrincipal, insertPelangganProgramPrincipalSchema } from "@shared/schema";
import { requireAuth } from "../auth";
import { getEffectiveBranch } from "./utils";
import { log } from "../logger";

export function registerPelangganProgramPrincipalRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Get all principal program registrations
  app.get("/api/pelanggan-program-principal", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const pelangganId = req.query.pelangganId ? Number(req.query.pelangganId) : undefined;
      
      let conditions = [];
      if (pelangganId) {
        conditions.push(eq(pelangganProgramPrincipal.pelangganId, pelangganId));
      } else if (bId) {
        conditions.push(eq(pelangganProgramPrincipal.branchId, bId));
      } else {
        return res.json([]);
      }
      
      const results = await db.query.pelangganProgramPrincipal.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          pelanggan: true,
          program: {
            with: {
              principal: true
            }
          }
        },
        orderBy: [desc(pelangganProgramPrincipal.createdAt)]
      });
      
      res.json(results);
    } catch (err: any) {
      log(`Error in GET /api/pelanggan-program-principal: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 2. Register a customer to a principal program
  app.post("/api/pelanggan-program-principal", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) throw new Error("ID Cabang tidak ditemukan");
      
      const parseResult = insertPelangganProgramPrincipalSchema.safeParse({
        ...req.body,
        branchId: bId
      });

      if (!parseResult.success) {
        return res.status(400).json({ message: parseResult.error.message });
      }

      const { pelangganId, programPrincipalId, branchId } = parseResult.data;

      const [inserted] = await db.insert(pelangganProgramPrincipal)
        .values({
          pelangganId,
          programPrincipalId,
          branchId: branchId!, // We know it's there because we set it before parse
          status: 'aktif'
        })
        .onConflictDoUpdate({
           target: [pelangganProgramPrincipal.pelangganId, pelangganProgramPrincipal.programPrincipalId, pelangganProgramPrincipal.branchId],
           set: { status: 'aktif' }
        })
        .returning();
      
      broadcast("/api/pelanggan-program-principal");
      res.json(inserted);
    } catch (err: any) {
      log(`Error in POST /api/pelanggan-program-principal: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 3. Delete a registration
  app.delete("/api/pelanggan-program-principal/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const bId = getEffectiveBranch(req);
      
      if (!bId) throw new Error("ID Cabang tidak ditemukan");

      const [deleted] = await db.delete(pelangganProgramPrincipal)
        .where(and(eq(pelangganProgramPrincipal.id, id), eq(pelangganProgramPrincipal.branchId, bId)))
        .returning();
        
      if (!deleted) throw new Error("Data tidak ditemukan");
      
      broadcast("/api/pelanggan-program-principal");
      res.json({ success: true });
    } catch (err: any) {
      log(`Error in DELETE /api/pelanggan-program-principal/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });
}
