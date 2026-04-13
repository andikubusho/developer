import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertShipment, type UpdateShipmentRequest, type ShipmentWithRelations } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/hooks/use-branch";
import { z } from "zod";

export interface ShipmentFilters {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useShipments(filters?: ShipmentFilters) {
  const { selectedBranchId } = useBranch();
  return useQuery<{ shipments: ShipmentWithRelations[], total: number, totalReturned: number, totalProcessed: number }>({
    queryKey: [api.shipments.list.path, selectedBranchId, filters],
    staleTime: 30 * 1000, // Shipments might change more often, 30s is safe
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedBranchId) queryParams.append("branchId", selectedBranchId.toString());
      if (filters?.limit) queryParams.append("limit", filters.limit.toString());
      if (filters?.offset) queryParams.append("offset", filters.offset.toString());
      if (filters?.search) queryParams.append("search", filters.search);
      if (filters?.status) queryParams.append("status", filters.status);
      if (filters?.startDate) queryParams.append("startDate", filters.startDate.toISOString());
      if (filters?.endDate) queryParams.append("endDate", filters.endDate.toISOString());
      
      const url = `${api.shipments.list.path}?${queryParams.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shipments");
      const data = await res.json();
      
      return {
        total: data.total || 0,
        totalReturned: data.totalReturned || 0,
        totalProcessed: data.totalProcessed || 0,
        shipments: (data.shipments || data).map((s: any) => ({
          ...s,
          inputDate: new Date(s.inputDate),
          shippingDate: s.shippingDate ? new Date(s.shippingDate) : null,
          verificationDate: s.verificationDate ? new Date(s.verificationDate) : null,
        })) as ShipmentWithRelations[]
      };
    },
  });
}

export function useShipment(id: number) {
  return useQuery({
    queryKey: [api.shipments.get.path, id],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const url = buildUrl(api.shipments.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch shipment");
      const data = await res.json();
      
      return {
        ...data,
        inputDate: new Date(data.inputDate),
        shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
        verificationDate: data.verificationDate ? new Date(data.verificationDate) : null,
      } as ShipmentWithRelations;
    },
    enabled: !!id,
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedBranchId } = useBranch();

  return useMutation({
    mutationFn: async (data: InsertShipment) => {
      const payload = { ...data };
      if (selectedBranchId && !payload.branchId) {
        payload.branchId = selectedBranchId;
      }
      const res = await fetch(api.shipments.create.path, {
        method: api.shipments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create shipment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shipments.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/branches", selectedBranchId, "promo-stats"] });
      toast({ title: "Berhasil", description: "Pengiriman baru ditambahkan" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.shipments.delete.path, { id });
      const res = await fetch(url, {
        method: api.shipments.delete.method,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Gagal menghapus data");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shipments.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] }); // Invalidate all branch stats
      toast({ title: "Berhasil", description: "Data pengiriman dihapus" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateShipmentRequest) => {
      const url = buildUrl(api.shipments.update.path, { id });
      const res = await fetch(url, {
        method: api.shipments.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update shipment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shipments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.shipments.get.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] }); // Invalidate branch stats for status changes
      toast({ title: "Berhasil", description: "Status pengiriman diperbarui" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useCancelPacking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.shipments.cancelPacking.path, { id });
      const res = await fetch(url, {
        method: api.shipments.cancelPacking.method,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Gagal membatalkan packing");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shipments.list.path] });
      toast({ title: "Berhasil", description: "Packing dibatalkan" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}

export function useCancelSiapKirim() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.shipments.cancelSiapKirim.path, { id });
      const res = await fetch(url, {
        method: api.shipments.cancelSiapKirim.method,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Gagal membatalkan pengiriman");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shipments.list.path] });
      toast({ title: "Berhasil", description: "Pengiriman dibatalkan" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });
}
