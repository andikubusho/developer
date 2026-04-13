import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { Server as SocketServer } from "socket.io";
import { log } from "./logger";
import { createBroadcaster, createOrderNotifier } from "./routes/utils";

// Import Modular Routes
import { registerAuthRoutes } from "./routes/auth";
import { registerMasterRoutes } from "./routes/masters";
import { registerCustomerRoutes } from "./routes/customers";
import { registerItemRoutes } from "./routes/items";
import { registerOrderRoutes } from "./routes/orders";
import { registerPromoConfigRoutes } from "./routes/promo_config";
import { registerPromoCashbackRoutes } from "./routes/promo_cashback";
import { registerPromoCuttingRoutes } from "./routes/promo_cutting";
import { registerPromoPaketRoutes } from "./routes/promo_paket";
import { registerPromoPointRoutes } from "./routes/promo_points";
import { registerPromoTransactionRoutes } from "./routes/promo_transactions";
import { registerPromoMonitoringRoutes } from "./routes/promo_monitoring";
import { registerPromoLiquidationRoutes } from "./routes/promo_liquidation";
import { registerPromoClaimsRoutes } from "./routes/promo_claims";
import { registerPromoRedemptionRoutes } from "./routes/promo_redemption";
import { registerPrincipalRoutes } from "./routes/principal";
import { registerPelangganProgramRoutes } from "./routes/pelanggan_program";
import { registerPelangganProgramPrincipalRoutes } from "./routes/pelanggan_program_principal";
import { registerShipmentRoutes } from "./routes/shipments";
import { registerSystemRoutes } from "./routes/system";

export async function registerRoutes(app: Express, httpServer: Server): Promise<void> {
  // 1. Auth Setup (API endpoints inside setupAuth)
  setupAuth(app);
  
  // 2. Socket.io Setup
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io"
  });

  const broadcast = createBroadcaster(io);
  const notifyOrderAdmins = createOrderNotifier(io);

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(`user_${userId}`);
      log(`[Socket] Client connected: ${socket.id} (User ID: ${userId}, joined room user_${userId})`);
    } else {
      log(`[Socket] Client connected: ${socket.id} (No User ID provided)`);
    }

    socket.on("disconnect", () => log(`[Socket] Client disconnected: ${socket.id}`));
  });

  // 3. Register Modular Route Sets
  registerAuthRoutes(app, broadcast);
  registerMasterRoutes(app, broadcast);
  registerCustomerRoutes(app, broadcast);
  registerItemRoutes(app, broadcast);
  registerOrderRoutes(app, broadcast, notifyOrderAdmins, io);
  
  // Promo Ecosystem
  registerPromoConfigRoutes(app, broadcast);
  registerPromoCashbackRoutes(app, broadcast);
  registerPromoCuttingRoutes(app, broadcast);
  registerPromoPaketRoutes(app, broadcast);
  registerPromoPointRoutes(app, broadcast);
  registerPromoTransactionRoutes(app, broadcast);
  registerPromoMonitoringRoutes(app, broadcast);
  registerPromoLiquidationRoutes(app, broadcast);
  registerPromoClaimsRoutes(app, broadcast);
  registerPromoRedemptionRoutes(app, broadcast);
  registerPelangganProgramRoutes(app, broadcast);
  registerPelangganProgramPrincipalRoutes(app, broadcast);
  
  // Principal & Joint Programs
  registerPrincipalRoutes(app, broadcast);
  registerShipmentRoutes(app, broadcast);
  
  // System & Stats
  await registerSystemRoutes(app, broadcast);
}
