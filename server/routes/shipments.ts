// @ts-nocheck
import { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { log } from "../logger";

export function registerShipmentRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. List Shipments
  app.get(api.shipments.list.path, requireAuth, async (req, res) => {
    try {
      const filters: any = { ...req.query };
      if (req.query.branchId) filters.branchId = parseInt(String(req.query.branchId));
      if (req.query.customerId) filters.customerId = parseInt(String(req.query.customerId));
      if (req.query.merekId) filters.merekId = parseInt(String(req.query.merekId));
      if (req.query.limit) filters.limit = parseInt(String(req.query.limit));
      if (req.query.offset) filters.offset = parseInt(String(req.query.offset));
      if (req.query.startDate) filters.startDate = new Date(String(req.query.startDate));
      if (req.query.endDate) filters.endDate = new Date(String(req.query.endDate));
      
      const result = await storage.getShipments(filters);
      res.json(result);
    } catch (err: any) {
      log(`Error listing shipments: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 2. Get Single Shipment
  app.get(api.shipments.get.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const shipment = await storage.getShipment(id);
      if (!shipment) return res.status(404).json({ message: "Pengiriman tidak ditemukan" });
      res.json(shipment);
    } catch (err: any) {
      log(`Error getting shipment ${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 3. Create Shipment (Simpan Faktur Baru)
  app.post(api.shipments.create.path, requireAuth, requirePermission("input_pengiriman", "input"), async (req, res) => {
    try {
      const { insertShipmentSchema } = await import("@shared/schema");
      const data = insertShipmentSchema.parse(req.body);
      const shipment = await storage.createShipment(data);
      
      await storage.recordAuditLog((req.user as any).id, "CREATE", "shipments", `Membuat pengiriman: ${shipment.invoiceNumber}`, shipment.branchId ?? undefined);
      broadcast(api.shipments.list.path);
      res.status(201).json(shipment);
    } catch (err: any) {
      log(`Error creating shipment: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // 4. Update Shipment (digunakan dari berbagai halaman: input, packing, siap kirim, terkirim, pengembalian)
  app.put(api.shipments.update.path, requireAuth, requirePermission(["input_pengiriman", "packing", "siap_kirim", "terkirim", "pengembalian"], "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const { updateShipmentSchema } = await import("@shared/schema");
      const data = updateShipmentSchema.parse(req.body);
      const shipment = await storage.updateShipment(id, data);
      
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "shipments", `Memperbarui pengiriman: ${shipment.invoiceNumber}`, shipment.branchId ?? undefined);
      broadcast(api.shipments.list.path);
      res.json(shipment);
    } catch (err: any) {
      log(`Error updating shipment ${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // 5. Delete Shipment
  app.delete(api.shipments.delete.path, requireAuth, requirePermission(["input_pengiriman", "packing", "siap_kirim", "terkirim", "pengembalian"], "delete"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const shipment = await storage.getShipment(id);
      if (!shipment) return res.status(404).json({ message: "Pengiriman tidak ditemukan" });
      
      await storage.deleteShipment(id);
      await storage.recordAuditLog((req.user as any).id, "DELETE", "shipments", `Menghapus pengiriman: ${shipment.invoiceNumber}`, shipment.branchId ?? undefined);
      broadcast(api.shipments.list.path);
      res.status(204).send();
    } catch (err: any) {
      log(`Error deleting shipment ${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 6. Cancel Packing
  app.put(api.shipments.cancelPacking.path, requireAuth, requirePermission("packing", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const shipment = await storage.updateShipment(id, { 
        status: "MENUNGGU_VERIFIKASI", 
        verificationDate: null, 
        packerName: null, 
        totalBoxes: null 
      });
      broadcast(api.shipments.list.path);
      res.json(shipment);
    } catch (err: any) {
      log(`Error cancelling packing for shipment ${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 7. Cancel Siap Kirim
  app.put(api.shipments.cancelSiapKirim.path, requireAuth, requirePermission("siap_kirim", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const shipment = await storage.updateShipment(id, { 
        status: "SIAP_KIRIM", 
        shippingDate: null, 
        receiptNumber: null, 
        senderName: null 
      });
      broadcast(api.shipments.list.path);
      res.json(shipment);
    } catch (err: any) {
      log(`Error cancelling siap kirim for shipment ${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });
}
