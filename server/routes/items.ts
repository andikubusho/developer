import { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../auth";
import { z } from "zod";
import { log } from "../logger";
import { getEffectiveBranch } from "./utils";

export function registerItemRoutes(app: Express, broadcast: (type: string) => void) {
  // === ITEMS (MASTER BARANG) ===
  app.get("/api/items", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const branchId = bId || undefined;
      const page = parseInt(String(req.query.page || "1"));
      const limit = parseInt(String(req.query.limit || "50"));
      const search = req.query.search ? String(req.query.search) : undefined;
      const stockStatus = req.query.stockStatus ? String(req.query.stockStatus) : undefined;

      if (req.query.all === "true") {
        return res.json(await storage.getItems(branchId, search, stockStatus));
      }

      const { items, total } = await storage.getItemsPaginated({
        branchId, offset: (page - 1) * limit, limit, search, stockStatus
      });

      res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err: any) {
      log(`Error in GET /api/items: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/items", requireAuth, requirePermission("master_barang", "input"), async (req, res) => {
    try {
      const { insertItemSchema } = await import("@shared/schema");
      const item = await storage.createItem(insertItemSchema.parse(req.body));
      await storage.recordAuditLog((req.user as any).id, "CREATE", "items", `Membuat barang: ${item.code} - ${item.name}`, item.branchId || undefined);
      broadcast("/api/items");
      res.status(201).json(item);
    } catch (err: any) {
      log(`Error in POST /api/items: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/items/:id", requireAuth, requirePermission("master_barang", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const { insertItemSchema } = await import("@shared/schema");
      const item = await storage.updateItem(id, insertItemSchema.partial().parse(req.body));
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "items", `Memperbarui barang: ${item.code}`, item.branchId || undefined);
      broadcast("/api/items");
      res.json(item);
    } catch (err: any) {
      log(`Error in PUT /api/items/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/items/:id", requireAuth, requirePermission("master_barang", "delete"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      await storage.deleteItem(id);
      await storage.recordAuditLog((req.user as any).id, "DELETE", "items", `Menghapus barang ID: ${id}`);
      broadcast("/api/items");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/items/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // Bulk Operations
  app.post("/api/items/bulk", requireAuth, requirePermission("master_barang", "input"), async (req, res) => {
    try {
      const { insertItemSchema } = await import("@shared/schema");
      const itemsArray = z.array(insertItemSchema).parse(req.body);
      const results = await storage.createItems(itemsArray);
      await storage.recordAuditLog((req.user as any).id, "CREATE", "items", `Bulk import: ${results.length} berhasil`);
      broadcast("/api/items");
      res.status(201).json({ created: results.length, items: results });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/items/stock/bulk", requireAuth, requirePermission("master_barang", "edit"), async (req, res) => {
    try {
      const data = z.array(z.object({ code: z.string(), stock: z.coerce.number(), branchId: z.coerce.number() })).parse(req.body);
      await storage.updateItemsStock(data);
      if (req.user) {
        const branchId = data.length > 0 ? data[0].branchId : undefined;
        await storage.recordAuditLog((req.user as any).id, "UPDATE_STOCK_BULK", "items", `Bulk updated stock for ${data.length} items`, branchId);
      }
      broadcast("/api/items");
      res.json({ updated: data.length });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/items/stock/last-update", requireAuth, async (req, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : getEffectiveBranch(req);
      const lastUpdate = await storage.getLastStockUpdate(branchId || undefined);
      res.json({ lastUpdate });
    } catch (err: any) {
      log(`Error in GET /api/items/stock/last-update: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });
}
