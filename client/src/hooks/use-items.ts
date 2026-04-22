import { useQuery, useMutation } from "@tanstack/react-query";
import { Item, InsertItem, ItemWithStock } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface PaginatedItems {
  items: ItemWithStock[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useItems(params: { branchId?: number, page?: number, limit?: number, search?: string, all?: boolean, stockStatus?: string } = {}) {
  const { branchId, page = 1, limit = 50, search, all = false, stockStatus } = params;
  
  return useQuery<PaginatedItems | ItemWithStock[]>({
    queryKey: ["/api/items", { branchId, page, limit, search, all, stockStatus }],
    staleTime: 30 * 1000, // Reduced stale time for more reactive data
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (branchId) searchParams.append("branchId", branchId.toString());
      if (all) {
        searchParams.append("all", "true");
      } else {
        searchParams.append("page", page.toString());
        searchParams.append("limit", limit.toString());
        if (search) searchParams.append("search", search);
        if (stockStatus && stockStatus !== "all") searchParams.append("stockStatus", stockStatus);
      }
      
      const res = await fetch(`/api/items?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data barang");
      return res.json();
    }
  });
}

export function useCreateItem() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: InsertItem) => {
      const res = await apiRequest("POST", "/api/items", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/stock/last-update"] });
      toast({ title: "Berhasil", description: "Barang berhasil ditambahkan" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateItem() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertItem>) => {
      const res = await apiRequest("PUT", `/api/items/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/stock/last-update"] });
      toast({ title: "Berhasil", description: "Barang berhasil diperbarui" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteItem() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Berhasil", description: "Barang berhasil dihapus" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });
}

export function useBulkCreateItem() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (items: any[]) => {
      const CHUNK_SIZE = 100;
      let totalCreated = 0;
      let totalSkipped = 0;
      const allResults: any[] = [];
      
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const res = await apiRequest("POST", "/api/items/bulk", chunk);
        const data = await res.json();
        totalCreated += data.created;
        totalSkipped += data.skipped;
        if (data.items) allResults.push(...data.items);
      }
      return { created: totalCreated, skipped: totalSkipped, items: allResults };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Berhasil", description: `${data.created} data barang berhasil diimpor/diperbarui` });
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });
}

export function useBulkUpdateStock() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { code: string; stock: number; branchId: number }[]) => {
      const CHUNK_SIZE = 25;
      let totalUpdated = 0;
      
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        const res = await apiRequest("PATCH", "/api/items/stock/bulk", chunk);
        const result = await res.json();
        totalUpdated += result.updated;
      }
      
      return { updated: totalUpdated };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/stock/last-update"] });
      toast({ title: "Berhasil", description: `${data.updated} data stok berhasil diperbarui` });
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });
}

export function useDeleteItemsByBranch() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (branchId: number) => {
      await apiRequest("DELETE", `/api/items/branch/${branchId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Berhasil", description: "Semua barang untuk cabang ini telah dihapus" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });
}

export function useStockLastUpdate(branchId?: number) {
  return useQuery<{ lastUpdate: string | null }>({
    queryKey: ["/api/items/stock/last-update", { branchId }],
    queryFn: async () => {
      const url = branchId 
        ? `/api/items/stock/last-update?branchId=${branchId}` 
        : `/api/items/stock/last-update`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data update terakhir");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
