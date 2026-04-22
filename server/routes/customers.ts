import { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { log } from "../logger";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { pointLogs, labelQuotas, labelClaims, insertSalesCustomerSchema } from "@shared/schema";
import { getEffectiveBranch } from "./utils";

export function registerCustomerRoutes(app: Express, broadcast: (type: string) => void) {
  // === CUSTOMERS ===
  app.get(api.customers.list.path, requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const customers = await storage.getCustomers(bId || undefined);
      res.json(customers);
    } catch (err: any) {
      log(`Error in GET /api/customers: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.customers.create.path, requireAuth, requirePermission("master_pelanggan", "input"), async (req, res) => {
    try {
      const input = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer(input);
      await storage.recordAuditLog((req.user as any).id, "CREATE", "customers", `Membuat pelanggan: ${customer.name}`, (req.user as any).branchId);
      broadcast("/api/customers");
      res.status(201).json(customer);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put(api.customers.update.path, requireAuth, requirePermission("master_pelanggan", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const input = api.customers.update.input.parse(req.body);
      const customer = await storage.updateCustomer(id, input);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "customers", `Memperbarui pelanggan: ${customer.name}`, (req.user as any).branchId);
      broadcast("/api/customers");
      res.json(customer);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete(api.customers.delete.path, requireAuth, requirePermission("master_pelanggan", "delete"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      await storage.deleteCustomer(id);
      broadcast("/api/customers");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/customers/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === SALES CUSTOMERS ===
  app.get("/api/sales-customers", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      res.json(await storage.getSalesCustomers(bId || undefined));
    } catch (err: any) {
      log(`Error in GET /api/sales-customers: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/sales-customers", requireAuth, requirePermission("master_pelanggan", "input"), async (req, res) => {
    try {
      const input = insertSalesCustomerSchema.parse(req.body);
      const customer = await storage.createSalesCustomer(input);
      await storage.recordAuditLog((req.user as any).id, "CREATE", "sales_customers", `Membuat pelanggan sales: ${customer.name}`, (req.user as any).branchId);
      broadcast("/api/sales-customers");
      res.status(201).json(customer);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/sales-customers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteSalesCustomer(parseInt(String(req.params.id)));
      broadcast("/api/sales-customers");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/sales-customers/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // === LOYALTY POINTS (LEGACY) ===
  app.get("/api/points/:customerCode", requireAuth, async (req, res) => {
    try {
      const customerCode = String(req.params.customerCode);
      const bId = getEffectiveBranch(req);
      const logs = await storage.getPointLogs({ customerCode, branchId: bId || undefined });
      const customer = await storage.getSalesCustomerByCode(customerCode, bId || undefined);
      res.json({ logs, totalPoint: customer?.totalPoint || 0 });
    } catch (err: any) {
      log(`Error in GET /api/points/${req.params.customerCode}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/points/earn", requireAuth, requirePermission("loyalty_points", "input"), async (req, res) => {
    try {
      const data = z.object({ customerCode: z.string(), point: z.number(), branchId: z.number() }).parse(req.body);
      await storage.createPointLog({ ...req.body, type: "earn", date: new Date() });
      await storage.recordAuditLog((req.user as any).id, "CREATE", "point_logs", `Tambah poin ${data.point} untuk ${data.customerCode}`, data.branchId);
      broadcast("/api/points");
      res.json({ message: "Poin berhasil ditambahkan" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // === CUTTING LABEL (LEGACY) ===
  app.get("/api/labels/:customerCode", requireAuth, async (req, res) => {
    try {
      const customerCode = String(req.params.customerCode);
      const bId = getEffectiveBranch(req);
      const claims = await storage.getLabelClaims({ customerCode, branchId: bId || undefined });
      const summary = await storage.getLabelSummary(customerCode, bId || undefined);
      res.json({ ...claims, ...summary });
    } catch (err: any) {
      log(`Error in GET /api/labels/${req.params.customerCode}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/labels/quota", requireAuth, requirePermission("cutting_label", "input"), async (req, res) => {
    try {
      const data = z.object({ customerCode: z.string(), amount: z.number(), branchId: z.number() }).parse(req.body);
      await storage.createLabelQuota({ ...req.body, date: new Date() });
      await storage.recordAuditLog((req.user as any).id, "CREATE", "label_quotas", `Tambah kuota label ${data.amount} untuk ${data.customerCode}`);
      broadcast("/api/labels");
      res.json({ message: "Kuota label berhasil ditambahkan" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });
}
