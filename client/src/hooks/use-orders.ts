import { useQuery, useMutation } from "@tanstack/react-query";
import { OrderWithItems, InsertOrder, InsertOrderItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface OrderFilters {
  date?: string;
  shopName?: string;
  region?: string;
  salesmanId?: number;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export function useOrders(filters?: OrderFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.date) queryParams.append("date", filters.date);
  if (filters?.shopName) queryParams.append("shopName", filters.shopName);
  if (filters?.region) queryParams.append("region", filters.region);
  if (filters?.salesmanId) queryParams.append("salesmanId", filters.salesmanId.toString());
  if (filters?.branchId) queryParams.append("branchId", filters.branchId.toString());
  if (filters?.limit) queryParams.append("limit", filters.limit.toString());
  if (filters?.offset) queryParams.append("offset", filters.offset.toString());
  if (filters?.startDate) queryParams.append("startDate", filters.startDate);
  if (filters?.endDate) queryParams.append("endDate", filters.endDate);

  return useQuery<{ orders: OrderWithItems[], total: number }>({
    queryKey: ["/api/orders", filters],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/orders?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data order");
      return res.json();
    }
  });
}

export function useCreateOrder() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ order, items }: { order: Omit<InsertOrder, "salesmanId" | "totalAmount">, items: Omit<InsertOrderItem, "orderId">[] }) => {
      // Calculate total amount on client side for convenience, but server will re-verify or trust
      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
      const res = await apiRequest("POST", "/api/orders", { ...order, totalAmount, items });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", { branchId: variables.order.branchId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] }); // Invalidate promo stats
      toast({ title: "Berhasil", description: "Surat Order berhasil dibuat" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateOrder() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, order, items }: { id: number, order: Partial<InsertOrder>, items?: Omit<InsertOrderItem, "orderId">[] }) => {
      const payload: any = { ...order };
      if (items) {
        payload.items = items;
        payload.totalAmount = items.reduce((sum, item) => sum + item.total, 0);
      }
      const res = await apiRequest("PUT", `/api/orders/${id}`, payload);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", { branchId: variables.order.branchId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] }); // Invalidate promo stats
      toast({ title: "Berhasil", description: "Surat Order berhasil diperbarui" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteOrder() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] }); // Invalidate promo stats
      toast({ title: "Berhasil", description: "Surat Order berhasil dihapus" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });
}
