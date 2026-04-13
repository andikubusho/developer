import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PrincipalMaster, type insertPrincipalMasterSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function usePrincipals(branchId?: number) {
  return useQuery<PrincipalMaster[]>({
    queryKey: branchId ? ["/api/promo/masters/principal", { branchId }] : ["/api/promo/masters/principal"],
    queryFn: async () => {
      const url = branchId ? `/api/promo/masters/principal?branchId=${branchId}` : "/api/promo/masters/principal";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data principal");
      return res.json();
    }
  });
}

export function useCreatePrincipal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/promo/masters/principal", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/principal"] });
      toast({ title: "Berhasil", description: "Principal berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdatePrincipal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/promo/masters/principal/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/principal"] });
      toast({ title: "Berhasil", description: "Principal berhasil diperbarui" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeletePrincipal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/promo/masters/principal/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/principal"] });
      toast({ title: "Berhasil", description: "Principal berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}
