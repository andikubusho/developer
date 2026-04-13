import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface LabelQuota {
  id: number;
  customerCode: string;
  amount: number;
  date?: string;
  invoiceNumber?: string;
  productName?: string;
  createdAt: string;
}

export interface LabelClaim {
  id: number;
  customerCode: string;
  amount: number;
  date?: string;
  notes?: string;
  createdAt: string;
}

export interface LabelData {
  quotas: LabelQuota[];
  claims: LabelClaim[];
  totalLabel: number;
  totalClaim: number;
  remaining: number;
}

export function useLabels(customerCode?: string, branchId?: number) {
  return useQuery({
    queryKey: ["/api/labels", customerCode, branchId],
    queryFn: async () => {
      if (!customerCode) return { quotas: [], claims: [], totalLabel: 0, totalClaim: 0, remaining: 0 } as LabelData;
      const url = branchId ? `/api/labels/${customerCode}?branchId=${branchId}` : `/api/labels/${customerCode}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch label history");
      return await res.json() as LabelData;
    },
    enabled: !!customerCode,
  });
}

export function useAddLabelQuota() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { 
      customerCode: string; 
      amount: number;
      date?: Date;
      invoiceNumber?: string;
      productName?: string;
      branchId: number;
    }) => {
      const res = await fetch("/api/labels/quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal menambah kuota label");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels", variables.customerCode, variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers", variables.branchId] });
      toast({ title: "Berhasil", description: "Kuota label berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useClaimLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { 
      customerCode: string; 
      amount: number;
      date?: Date;
      notes?: string;
      branchId: number;
    }) => {
      const res = await fetch("/api/labels/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal melakukan klaim label");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels", variables.customerCode, variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers", variables.branchId] });
      toast({ title: "Berhasil", description: "Klaim label berhasil" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteLabelQuota() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/labels/quota/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal menghapus kuota");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers"] });
      toast({ title: "Berhasil", description: "Kuota label berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteLabelClaim() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/labels/claim/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal menghapus klaim");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers"] });
      toast({ title: "Berhasil", description: "Klaim label berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}
