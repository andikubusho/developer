import { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../auth";
import { api } from "@shared/routes";
import { log } from "../logger";

export function registerMasterRoutes(app: Express, broadcast: (type: string) => void) {
  // === BRANCHES ===
  app.get(api.branches.list.path, requireAuth, async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (err: any) {
      log(`Error in GET /api/branches: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.branches.create.path, requireAuth, requirePermission("master_cabang", "input"), async (req, res) => {
    try {
      const input = api.branches.create.input.parse(req.body);
      const branch = await storage.createBranch(input);
      await storage.recordAuditLog((req.user as any).id, "CREATE", "branches", `Membuat cabang: ${branch.name}`, (req.user as any).branchId);
      broadcast("/api/branches");
      res.status(201).json(branch);
    } catch (err: any) {
      log(`Error in POST /api/branches: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.put(api.branches.update.path, requireAuth, requirePermission("master_cabang", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const input = api.branches.update.input.parse(req.body);
      const branch = await storage.updateBranch(id, input);
      if (!branch) return res.status(404).json({ message: "Branch not found" });
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "branches", `Memperbarui cabang: ${branch.name}`, (req.user as any).branchId);
      broadcast("/api/branches");
      res.json(branch);
    } catch (err: any) {
      log(`Error in PUT /api/branches/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete(api.branches.delete.path, requireAuth, requirePermission("master_cabang", "delete"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const branch = await storage.getBranch(id);
      await storage.deleteBranch(id);
      if (branch) await storage.recordAuditLog((req.user as any).id, "DELETE", "branches", `Menghapus cabang: ${branch.name}`, (req.user as any).branchId);
      broadcast("/api/branches");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/branches/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === EXPEDITIONS ===
  app.get(api.expeditions.list.path, requireAuth, async (req, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : undefined;
      const expeditions = await storage.getExpeditions(branchId);
      res.json(expeditions);
    } catch (err: any) {
      log(`Error in GET /api/expeditions: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.expeditions.create.path, requireAuth, requirePermission("master_ekspedisi", "input"), async (req, res) => {
    try {
      const input = api.expeditions.create.input.parse(req.body);
      const expedition = await storage.createExpedition(input);
      await storage.recordAuditLog((req.user as any).id, "CREATE", "expeditions", `Membuat ekspedisi: ${expedition.name}`, (req.user as any).branchId);
      broadcast("/api/expeditions");
      res.status(201).json(expedition);
    } catch (err: any) {
      log(`Error in POST /api/expeditions: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.put(api.expeditions.update.path, requireAuth, requirePermission("master_ekspedisi", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const input = api.expeditions.update.input.parse(req.body);
      const expedition = await storage.updateExpedition(id, input);
      if (expedition) await storage.recordAuditLog((req.user as any).id, "UPDATE", "expeditions", `Memperbarui ekspedisi: ${expedition.name}`, (req.user as any).branchId);
      broadcast("/api/expeditions");
      res.json(expedition);
    } catch (err: any) {
      log(`Error in PUT /api/expeditions/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete(api.expeditions.delete.path, requireAuth, requirePermission("master_ekspedisi", "delete"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      await storage.deleteExpedition(id);
      broadcast("/api/expeditions");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/expeditions/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === TAXES ===
  app.get("/api/taxes", requireAuth, async (req, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : undefined;
      res.json(await storage.getTaxes(branchId));
    } catch (err: any) {
      log(`Error in GET /api/taxes: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/taxes/active", requireAuth, async (req, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : undefined;
      res.json(await storage.getActiveTax(branchId) || null);
    } catch (err: any) {
      log(`Error in GET /api/taxes/active: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === AUDIT LOGS ===
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const isAdmin = (req.user as any).id === 1;
      const permissions = await storage.getUserPermissions((req.user as any).id);
      const canManageUsers = isAdmin || permissions.some(p => p.menuKey === "manajemen_pengguna" && p.canView);
      if (!canManageUsers) return res.sendStatus(403);
      
      const { page, limit, search, action, startDate, endDate, branchId } = req.query;
      
      if (page && limit) {
         const result = await storage.getAuditLogsPaginated({
            branchId: branchId ? parseInt(String(branchId)) : undefined,
            page: parseInt(String(page)),
            limit: parseInt(String(limit)),
            search: search ? String(search) : undefined,
            action: action ? String(action) : undefined,
            startDate: startDate ? String(startDate) : undefined,
            endDate: endDate ? String(endDate) : undefined
         });
         res.json(result);
      } else {
         const logs = await storage.getAuditLogs(branchId ? parseInt(String(branchId)) : undefined);
         res.json(logs);
      }
    } catch (err: any) {
      log(`Error in GET /api/audit-logs: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });
}
