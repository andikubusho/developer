import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface PointLog {
  id: number;
  customerCode: string;
  point: number;
  type: "earn" | "redeem";
  date?: string;
  invoiceNumber?: string;
  productName?: string;
  notes?: string;
  branchId: number;
  createdAt: string;
}

export function usePoints(customerCode?: string, branchId?: number) {
  return useQuery({
    queryKey: ["/api/points", customerCode, branchId],
    queryFn: async () => {
      if (!customerCode) return { logs: [], totalPoint: 0 };
      const url = branchId ? `/api/points/${customerCode}?branchId=${branchId}` : `/api/points/${customerCode}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch points history");
      return await res.json() as { logs: PointLog[], totalPoint: number };
    },
    enabled: !!customerCode,
  });
}

export function useEarnPoints() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { 
      customerCode: string; 
      point: number;
      date?: Date;
      invoiceNumber?: string;
      productName?: string;
      notes?: string;
      branchId: number;
    }) => {
      const res = await fetch("/api/points/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal menambah poin");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/points", variables.customerCode, variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers", variables.branchId] });
      toast({ title: "Berhasil", description: "Poin berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useRedeemPoints() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { 
      customerCode: string; 
      point: number;
      date?: Date;
      invoiceNumber?: string;
      productName?: string;
      notes?: string;
      branchId: number;
    }) => {
      const res = await fetch("/api/points/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal menukar poin");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/points", variables.customerCode, variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers", variables.branchId] });
      toast({ title: "Berhasil", description: "Poin berhasil ditukar" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeletePointAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/points/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal menghapus transaksi");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers"] });
      toast({ title: "Berhasil", description: "Transaksi poin berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}
