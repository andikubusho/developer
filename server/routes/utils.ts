import { Server as SocketServer } from "socket.io";
import { log } from "../logger";

export const getEffectiveBranch = (req: any) => {
  const q = req.query || {};
  const b = req.body || {};
  const userBranchId = (req.user as any)?.branchId;
  
  if (q.branchId && q.branchId !== 'null' && q.branchId !== 'undefined') {
    return Number(q.branchId);
  }
  if (b.branchId && b.branchId !== 'null' && b.branchId !== 'undefined') {
    return Number(b.branchId);
  }
  return userBranchId || null;
};

export const createBroadcaster = (io: SocketServer) => (type: string) => {
  io.emit("data_updated", { type });
  log(`Broadcasted data_updated for: ${type}`, "socket");
};

export const createOrderNotifier = (io: SocketServer) => async (order: any) => {
  try {
    log(`[Notifier] Broadcasting new_order for order ${order.id}, branchId=${order.branchId}`, "socket");
    const connectedSockets = io.sockets.sockets.size;
    log(`[Notifier] Connected sockets: ${connectedSockets}`, "socket");
    
    // Broadcast to ALL connected clients - frontend handles permission filtering
    io.emit('new_order', order);
    log(`[Notifier] ✓ Broadcasted 'new_order' to all ${connectedSockets} connected clients`, "socket");
  } catch (err) {
    console.error('[Notifier] Error:', err);
  }
};
