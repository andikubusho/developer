import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type InsertSalesCustomer, type UpdateSalesCustomerRequest, type SalesCustomer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/hooks/use-branch";

export function useSalesCustomers(branchId?: number) {
  return useQuery({
    queryKey: ["/api/sales-customers", branchId],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const url = branchId ? `/api/sales-customers?branchId=${branchId}` : "/api/sales-customers";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales customers");
      return await res.json() as SalesCustomer[];
    },
  });
}

export function useCreateSalesCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedBranchId } = useBranch();

  return useMutation({
    mutationFn: async (data: InsertSalesCustomer) => {
      const payload = { ...data };
      if (selectedBranchId && !payload.branchId) {
        payload.branchId = selectedBranchId;
      }
      const res = await fetch("/api/sales-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create customer");
      }
      return await res.json() as SalesCustomer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers", variables.branchId || selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers"] });
      toast({ title: "Berhasil", description: "Pelanggan Sales berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateSalesCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateSalesCustomerRequest) => {
      const res = await fetch(`/api/sales-customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update customer");
      }
      return await res.json() as SalesCustomer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers"] });
      toast({ title: "Berhasil", description: "Data pelanggan sales diperbarui" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteSalesCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sales-customers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete customer");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers"] });
      toast({ title: "Berhasil", description: "Pelanggan sales dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}
