import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type InsertTax, type UpdateTaxRequest, type Tax } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useTaxes(branchId?: number) {
  return useQuery({
    queryKey: ["/api/taxes", branchId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const url = branchId ? `/api/taxes?branchId=${branchId}` : "/api/taxes";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch taxes");
      return res.json() as Promise<Tax[]>;
    },
  });
}

export function useActiveTax(branchId?: number) {
  return useQuery({
    queryKey: ["/api/taxes/active", branchId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const url = branchId ? `/api/taxes/active?branchId=${branchId}` : "/api/taxes/active";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active tax");
      return res.json() as Promise<Tax | null>;
    },
  });
}

export function useCreateTax() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertTax) => {
      const res = await fetch("/api/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create tax");
      }
      return res.json() as Promise<Tax>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/taxes/active"] });
      toast({ title: "Sukses", description: "PPN berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTax() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTaxRequest & { id: number }) => {
      const res = await fetch(`/api/taxes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update tax");
      }
      return res.json() as Promise<Tax>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/taxes/active"] });
      toast({ title: "Sukses", description: "PPN berhasil diubah" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteTax() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/taxes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to delete tax");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/taxes/active"] });
      toast({ title: "Sukses", description: "PPN berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });
}
