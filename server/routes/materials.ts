import { Express } from "express";
import { db } from "../db";
import { 
  materialSuppliers, 
  projectMaterialStocks, 
  materialStockLogs,
  rabProjects,
  rabItems,
  purchaseRequests,
  purchaseOrders,
  projects,
  propertyUnits,
  materials as materialTable,
  insertMaterialSupplierSchema,
  insertMaterialStockLogSchema
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, requirePermission } from "../auth";
import { storage } from "../storage";
import { log } from "../logger";
import crypto from "crypto";

export function registerMaterialRoutes(app: Express, broadcast: (type: string) => void) {
  
  // === SUPPLIERS ===
  app.get("/api/material-suppliers", requireAuth, async (req, res) => {
    try {
      const suppliers = await db.select().from(materialSuppliers).orderBy(desc(materialSuppliers.createdAt));
      res.json(suppliers);
    } catch (err: any) {
      log(`Error in GET /api/material-suppliers: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/material-suppliers", requireAuth, requirePermission("material-suppliers", "input"), async (req, res) => {
    try {
      const data = insertMaterialSupplierSchema.parse(req.body);
      const [supplier] = await db.insert(materialSuppliers).values(data).returning();
      broadcast("/api/material-suppliers");
      res.status(201).json(supplier);
    } catch (err: any) {
      log(`Error in POST /api/material-suppliers: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // === PROJECT STOCKS ===
  app.get("/api/project-material-stocks", requireAuth, async (req, res) => {
    try {
      const { projectId } = req.query;
      if (!projectId) return res.status(400).json({ message: "Project ID is required" });
      
      const stocks = await db.select().from(projectMaterialStocks).where(eq(projectMaterialStocks.projectId, String(projectId)));
      res.json(stocks);
    } catch (err: any) {
      log(`Error in GET /api/project-material-stocks: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === STOCK LOGS ===
  app.get("/api/material-stock-logs", requireAuth, async (req, res) => {
    try {
      const { projectId, materialId } = req.query;
      let query = db.select().from(materialStockLogs);
      
      const conditions = [];
      if (projectId) conditions.push(eq(materialStockLogs.projectId, String(projectId)));
      if (materialId) conditions.push(eq(materialStockLogs.materialId, String(materialId)));
      if (req.query.unitId) conditions.push(eq(materialStockLogs.unitId, String(req.query.unitId)));
      
      if (conditions.length > 0) {
        // @ts-ignore
        query = query.where(and(...conditions));
      }
      
      const logs = await query.orderBy(desc(materialStockLogs.createdAt)).limit(100);
      res.json(logs);
    } catch (err: any) {
      log(`Error in GET /api/material-stock-logs: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === TRANSACTIONS (ATOMIC RPC CALL) ===
  app.post("/api/material-transactions", requireAuth, async (req, res) => {
    try {
      const { transactions } = req.body; // Array of transaction objects
      
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ message: "Transactions array is required" });
      }

      const user = req.user as any;

      // Process each transaction in a loop (Drizzle execute is atomic enough per call, 
      // but if we want whole bulk to be atomic we should use db.transaction)
      await db.transaction(async (tx) => {
        for (const trx of transactions) {
          const { 
            materialId, 
            projectId, 
            transactionType, 
            qtyChange, 
            referenceType, 
            referenceId, 
            notes,
            unitId 
          } = trx;

          if (!materialId || !projectId || !transactionType || qtyChange === undefined) {
            throw new Error("Missing required fields in one of the transactions");
          }

          await tx.execute(sql`
            SELECT process_material_transaction(
              ${materialId}::uuid,
              ${projectId}::uuid,
              ${transactionType},
              ${qtyChange}::numeric,
              ${referenceType || null},
              ${referenceId ? sql`${referenceId}::uuid` : null},
              ${user.id},
              ${notes || null},
              ${unitId ? sql`${unitId}::uuid` : null}
            )
          `);
        }
      });

      broadcast("/api/material-stock-logs");
      broadcast("/api/project-material-stocks");
      
      res.status(200).json({ message: "All transactions processed successfully" });
    } catch (err: any) {
      log(`Error in POST /api/material-transactions: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // === PROJECTS (HELPER) ===
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const list = await db.select().from(projects).orderBy(desc(projects.createdAt));
      res.json(list);
    } catch (err: any) {
      log(`Error in GET /api/projects: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === UNITS (HELPER) ===
  app.get("/api/units", requireAuth, async (req, res) => {
    try {
      const { projectId } = req.query;
      let query = db.select().from(propertyUnits);
      if (projectId) {
        query = query.where(eq(propertyUnits.projectId, String(projectId))) as any;
      }
      const list = await query.orderBy(propertyUnits.unitNumber);
      res.json(list);
    } catch (err: any) {
      log(`Error in GET /api/units: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === RAB PROJECTS ===
  app.get("/api/rab-projects", requireAuth, async (req, res) => {
    try {
      const list = await db.select().from(rabProjects).orderBy(desc(rabProjects.createdAt));
      res.json(list);
    } catch (err: any) {
      log(`Error in GET /api/rab-projects: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/rab-items", requireAuth, async (req, res) => {
    try {
      const { rabProjectId } = req.query;
      if (!rabProjectId) return res.status(400).json({ message: "RAB Project ID is required" });
      const list = await db.select().from(rabItems).where(eq(rabItems.rabProjectId, String(rabProjectId))).orderBy(rabItems.urutan);
      res.json(list);
    } catch (err: any) {
      log(`Error in GET /api/rab-items: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === PURCHASE REQUESTS ===
  app.get("/api/purchase-requests", requireAuth, async (req, res) => {
    try {
      const { projectId } = req.query;
      let baseQuery = db.select().from(purchaseRequests);
      
      const list = await baseQuery
        .leftJoin(projects, eq(purchaseRequests.projectId, projects.id))
        .leftJoin(propertyUnits, eq(purchaseRequests.unitId, propertyUnits.id))
        .where(projectId ? eq(purchaseRequests.projectId, String(projectId)) : undefined)
        .orderBy(desc(purchaseRequests.createdAt))
        .select({
          id: purchaseRequests.id,
          projectId: purchaseRequests.projectId,
          unitId: purchaseRequests.unitId,
          itemName: purchaseRequests.itemName,
          status: purchaseRequests.status,
          items: purchaseRequests.items,
          createdAt: purchaseRequests.createdAt,
          project: {
            name: projects.name
          },
          unit: {
            unit_number: propertyUnits.unitNumber
          }
        });
      res.json(list);
    } catch (err: any) {
      log(`Error in GET /api/purchase-requests: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/purchase-requests", requireAuth, requirePermission("purchase-requests", "input"), async (req, res) => {
    try {
      const { projectId, unitId, items, itemName } = req.body;
      
      // Basic validation
      if (!projectId || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Project ID and items array are required" });
      }

      // TODO: RAB Validation Logic
      // Check each item in 'items' against rab_items volume/price
      // For now, we allow insertion but record audit log
      
      const newPR = {
        id: crypto.randomUUID(),
        projectId,
        unitId: unitId || null,
        itemName: itemName || `PR - ${new Date().toLocaleDateString()}`,
        status: "SUBMITTED",
        items,
        createdAt: new Date()
      };

      const [inserted] = await db.insert(purchaseRequests).values(newPR).returning();
      
      await storage.recordAuditLog(
        (req.user as any).id, 
        "CREATE", 
        "purchase_requests", 
        `Membuat PR baru untuk proyek ${projectId}`,
        (req.user as any).branchId
      );

      broadcast("/api/purchase-requests");
      res.status(201).json(inserted);
    } catch (err: any) {
      log(`Error in POST /api/purchase-requests: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/purchase-requests/:id/status", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) return res.status(400).json({ message: "Status is required" });
      
      const [updated] = await db.update(purchaseRequests)
        .set({ status })
        .where(eq(purchaseRequests.id, id))
        .returning();
      
      await storage.recordAuditLog(
        (req.user as any).id, 
        "UPDATE_STATUS", 
        "purchase_requests", 
        `Mengubah status PR ${id} menjadi ${status}`,
        (req.user as any).branchId
      );

      broadcast("/api/purchase-requests");
      res.json(updated);
    } catch (err: any) {
      log(`Error in PATCH /api/purchase-requests/${req.params.id}/status: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // === PURCHASE ORDERS ===
  app.get("/api/purchase-orders", requireAuth, async (req, res) => {
    try {
      const list = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
      res.json(list);
    } catch (err: any) {
      log(`Error in GET /api/purchase-orders: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === MATERIALS (PROXY/HELPER) ===
  app.get("/api/materials", requireAuth, async (req, res) => {
    try {
      const list = await db.select().from(materialTable).orderBy(materialTable.name);
      res.json(list);
    } catch (err: any) {
      log(`Error in GET /api/materials: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });
}
