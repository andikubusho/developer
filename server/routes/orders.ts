// @ts-nocheck
import { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { log } from "../logger";

export function registerOrderRoutes(app: Express, broadcast: (type: string) => void, notifyOrderAdmins: (order: any) => void, io: any) {
  // === ORDERS (SURAT ORDER) ===
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const filters: any = { ...req.query };
      if (req.query.salesmanId) filters.salesmanId = parseInt(String(req.query.salesmanId));
      if (req.query.branchId) filters.branchId = parseInt(String(req.query.branchId));
      if (req.query.customerId) filters.customerId = parseInt(String(req.query.customerId));
      if (req.query.limit) filters.limit = parseInt(String(req.query.limit));
      if (req.query.offset) filters.offset = parseInt(String(req.query.offset));
      if (req.query.startDate) filters.startDate = new Date(String(req.query.startDate));
      if (req.query.endDate) filters.endDate = new Date(String(req.query.endDate));
      
      const result = await storage.getOrders(filters);
      res.json(result);
    } catch (err: any) {
      log(`Error in GET /api/orders: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/orders", requireAuth, requirePermission("surat_order", "input"), async (req, res) => {
    try {
      const { insertOrderSchema, insertOrderItemSchema } = await import("@shared/schema");
      const orderData = insertOrderSchema.parse({ 
        ...req.body, 
        salesmanId: (req.user as any).id, 
        date: req.body.date ? new Date(req.body.date) : new Date() 
      });
      const itemsData = z.array(insertOrderItemSchema.omit({ orderId: true })).parse(req.body.items);
      const order = await storage.createOrder(orderData, itemsData);
      
      notifyOrderAdmins(order);
      await storage.recordAuditLog((req.user as any).id, "CREATE", "orders", `Membuat Surat Order untuk ${order.shopName}`, order.branchId ?? undefined);
      broadcast("/api/orders");
      res.status(201).json(order);
    } catch (err: any) {
      log(`Error in POST /api/orders: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // NEW: Full Order Update
  app.put("/api/orders/:id", requireAuth, requirePermission("surat_order", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const { insertOrderSchema, insertOrderItemSchema } = await import("@shared/schema");
      
      // We allow partial updates for the order header, but items are usually replaced
      const orderData = insertOrderSchema.partial().parse(req.body);
      const itemsData = req.body.items ? z.array(insertOrderItemSchema.omit({ orderId: true })).parse(req.body.items) : undefined;
      
      const order = await storage.updateOrder(id, orderData, itemsData);
      
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "orders", `Memperbarui Surat Order #${id} untuk ${order.shopName}`, order.branchId ?? undefined);
      broadcast("/api/orders");
      res.json(order);
    } catch (err: any) {
      log(`Error in PUT /api/orders/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/orders/:id/status", requireAuth, requirePermission("surat_order", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const { status } = z.object({ status: z.string() }).parse(req.body);
      const userId = (req.user as any).id;
      const currentOrder = await storage.getOrderById(id);
      if (!currentOrder) return res.status(404).json({ message: "Pesanan tidak ditemukan" });

      if (currentOrder.status === status) return res.json(currentOrder);

      const updateData: any = { status };
      if (!currentOrder.processedBy) {
        updateData.processedBy = userId;
        updateData.acknowledgedAt = new Date();
      }
      const order = await storage.updateOrder(id, updateData);
      await storage.recordAuditLog(userId, "UPDATE", "orders", `Memperbarui status pesanan ${id} menjadi ${status}`, order.branchId ?? undefined);
      
      const processor = await storage.getUserById(userId);
      io.emit("order_processed", { 
        orderId: id, status, processedBy: userId, processorName: processor?.displayName,
        acknowledgedAt: updateData.acknowledgedAt || currentOrder.acknowledgedAt
      });
      broadcast("/api/orders");
      res.json(order);
    } catch (err: any) {
      log(`Error in PATCH /api/orders/${req.params.id}/status: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/orders/:id", requireAuth, requirePermission("surat_order", "delete"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const order = await storage.getOrderById(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      await storage.deleteOrder(id);
      await storage.recordAuditLog((req.user as any).id, "DELETE", "orders", `Menghapus Surat Order untuk ${order.shopName}`, order.branchId ?? undefined);
      broadcast("/api/orders");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/orders/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });
}
