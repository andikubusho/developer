import { useState, useEffect } from "react";
import { useSocket } from "@/providers/socket-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Eye, Printer } from "lucide-react";
import { useBranch } from "@/hooks/use-branch";
import { OrderWithItems } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function NotificationManager() {
  const { socket } = useSocket();
  const { can, isAdmin } = usePermissions();
  const [, setLocation] = useLocation();
  const { selectedBranchId } = useBranch();
  const { toast } = useToast();
  const [newOrder, setNewOrder] = useState<OrderWithItems | null>(null);
  const [processorName, setProcessorName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (order: OrderWithItems) => {
      const isBranchMatch = !selectedBranchId || order.branchId === selectedBranchId;
      const canReceive = isAdmin || can('pop_up_notif_so', 'view');

      if (canReceive && isBranchMatch) {
        setNewOrder(order);
        setProcessorName((order as any).processor?.displayName || null);
        setOpen(true);

        // Optional: play notification sound
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        } catch (e) {}
      }
    };

    const handleOrderProcessed = (data: { orderId: number, status: string, processorName: string }) => {
      setNewOrder(prev => {
        if (prev && prev.id === data.orderId) {
          setProcessorName(data.processorName);
          return { ...prev, status: data.status };
        }
        return prev;
      });
    };

    socket.on("new_order", handleNewOrder);
    socket.on("order_processed", handleOrderProcessed);

    return () => {
      socket.off("new_order", handleNewOrder);
      socket.off("order_processed", handleOrderProcessed);
    };
  }, [socket, can, isAdmin, selectedBranchId]);

  const handleUpdateStatus = async (status: string, navigatePath?: string) => {
    if (!newOrder) return;
    console.log(`[Notification] Updating order ${newOrder.id} status to ${status}...`);
    try {
      await apiRequest("PATCH", `/api/orders/${newOrder.id}/status`, { status });
      console.log(`[Notification] Status update successful for order ${newOrder.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setOpen(false);
      
      toast({
        title: "Status Diperbarui",
        description: `Order #${newOrder.id} sekarang berstatus: ${status}`,
      });

      if (navigatePath) {
        const finalPath = status === "diterima" 
          ? `${navigatePath}?viewOrder=${newOrder.id}` 
          : navigatePath;
        console.log(`[Notification] Navigating to ${finalPath}`);
        setLocation(finalPath);
      }
    } catch (e) {
      console.error(`[Notification] Failed to update status for order ${newOrder.id}:`, e);
      toast({
        title: "Gagal memperbarui status",
        description: (e as Error).message,
        variant: "destructive"
      });
      
      // Even if status update fails, if we have a path, let the user go there
      if (navigatePath) {
        setOpen(false);
        const finalPath = status === "diterima" 
          ? `${navigatePath}?viewOrder=${newOrder.id}` 
          : navigatePath;
        setLocation(finalPath);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl ring-1 ring-slate-100 bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Pesanan Baru!</DialogTitle>
              <DialogDescription className="font-medium text-slate-500">Ada Surat Order masuk dari Salesman.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {newOrder && (
          <div className="py-2 space-y-4">
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-[0.2em]">Toko / Pelanggan</div>
                  <div className="text-xl font-bold text-slate-900 leading-tight">{newOrder.shopName}</div>
                  <div className="text-sm font-medium text-indigo-600 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                    {newOrder.city}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-[0.2em]">Salesman</div>
                  <div className="text-sm font-bold text-slate-700">{(newOrder as any).salesman?.displayName || "Sales"}</div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center px-4 py-2">
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest text-[10px]">Total Order</div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tighter">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(newOrder.finalTotal)}
              </div>
            </div>

            {processorName && (
              <div className="mx-4 p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <div className="text-xs font-bold text-amber-700">
                  Sedang diproses oleh: <span className="uppercase">{processorName}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex sm:flex-col gap-3 mt-6">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button 
                variant="outline" 
                className="rounded-2xl h-12 font-bold border-slate-200 hover:bg-slate-50 text-slate-600" 
                onClick={() => setOpen(false)}
            >
              Nanti Saja
            </Button>
            <Button 
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 font-bold transition-all active:scale-95" 
                onClick={() => handleUpdateStatus("diterima", "/salesman/orders")}
            >
              <Eye className="w-4 h-4 mr-2" /> Lihat
            </Button>
          </div>
          <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 font-black shadow-lg shadow-indigo-100 transition-all active:scale-95" 
              onClick={() => handleUpdateStatus("sudah di print", "/salesman/orders")}
          >
            <Printer className="w-4 h-4 mr-2" /> Cek & Print Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
