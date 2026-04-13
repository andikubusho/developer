import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCustomer, type UpdateCustomerRequest, type Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/hooks/use-branch";

export function useCustomers(branchId?: number) {
  const { selectedBranchId } = useBranch();
  const effectiveBranchId = branchId !== undefined ? branchId : selectedBranchId;
  return useQuery({
    queryKey: [api.customers.list.path, effectiveBranchId],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const url = effectiveBranchId ? `${api.customers.list.path}?branchId=${effectiveBranchId}` : api.customers.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      return api.customers.list.responses[200].parse(data);
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedBranchId } = useBranch();

  return useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const payload = { ...data };
      if (selectedBranchId && !payload.branchId) {
        payload.branchId = selectedBranchId;
      }
      const res = await fetch(api.customers.create.path, {
        method: api.customers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create customer");
      }
      return api.customers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
      toast({ title: "Berhasil", description: "Pelanggan berhasil ditambahkan" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateCustomerRequest) => {
      const url = buildUrl(api.customers.update.path, { id });
      const res = await fetch(url, {
        method: api.customers.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update customer");
      }
      return api.customers.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
      toast({ title: "Berhasil", description: "Data pelanggan diperbarui" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.customers.delete.path, { id });
      const res = await fetch(url, {
        method: api.customers.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete customer");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
      toast({ title: "Berhasil", description: "Pelanggan dihapus" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}
