import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertExpedition, type UpdateExpeditionRequest, type Expedition } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useExpeditions(branchId?: number) {
  return useQuery({
    queryKey: [api.expeditions.list.path, branchId],
    staleTime: 5 * 60 * 1000, 
    queryFn: async () => {
      const url = branchId ? `${api.expeditions.list.path}?branchId=${branchId}` : api.expeditions.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expeditions");
      const data = await res.json();
      return api.expeditions.list.responses[200].parse(data);
    },
  });
}

export function useCreateExpedition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertExpedition) => {
      const res = await fetch(api.expeditions.create.path, {
        method: api.expeditions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create expedition");
      }
      return api.expeditions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expeditions.list.path] });
      toast({ title: "Berhasil", description: "Ekspedisi berhasil ditambahkan" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateExpedition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateExpeditionRequest) => {
      const url = buildUrl(api.expeditions.update.path, { id });
      const res = await fetch(url, {
        method: api.expeditions.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update expedition");
      }
      return api.expeditions.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expeditions.list.path] });
      toast({ title: "Berhasil", description: "Data ekspedisi diperbarui" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteExpedition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.expeditions.delete.path, { id });
      const res = await fetch(url, {
        method: api.expeditions.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete expedition");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expeditions.list.path] });
      toast({ title: "Berhasil", description: "Ekspedisi dihapus" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}
