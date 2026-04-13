import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { UserPermission } from "@shared/schema";

export function usePermissions() {
  const { user } = useAuth();

  const { data: permissions = [], isLoading, error } = useQuery<UserPermission[]>({
    queryKey: [`/api/users/${user?.id}/permissions`],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      try {
        const res = await fetch(`/api/users/${user?.id}/permissions`, {
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Failed to fetch permissions");
        return res.json();
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
      }
    },
    enabled: !!user?.id,
  });

  const dashboards = (user?.authorizedDashboards ?? []).map(d => d.toLowerCase());
  const isAdmin = user?.id === 1
    || ['admin', 'superadmin', 'root'].includes((user?.role ?? '').toLowerCase())
    || dashboards.some(d => ['admin', 'superadmin', 'root'].includes(d));

  const can = (menuKey: string | string[], action: "view" | "input" | "edit" | "delete" | "export" | "print") => {
    if (!user) return false;
    if (isAdmin) return true;

    const keys = Array.isArray(menuKey) ? menuKey : [menuKey];
    
    // Find permission for the specific keys (prioritize non-fallback keys)
    const catchAllKey = "promo_toko";
    const specificKeys = keys.map(k => k.toLowerCase()).filter(k => k !== catchAllKey);
    
    // Check if any specific key is present in user permissions
    const specificPerm = permissions.find(p => specificKeys.includes(p.menuKey.toLowerCase()));
    
    if (specificPerm) {
      // If we found a specific permission, use its values
      if (action === "view") return specificPerm.canView ?? true;
      if (action === "input") return specificPerm.canInput;
      if (action === "edit") return specificPerm.canEdit;
      if (action === "delete") return specificPerm.canDelete;
      if (action === "export") return specificPerm.canExport ?? false;
      if (action === "print") return specificPerm.canPrint ?? false;
      return false;
    }

    // Fallback to catch-all if allowed and present
    if (keys.map(k => k.toLowerCase()).includes(catchAllKey)) {
      const fallbackPerm = permissions.find(p => p.menuKey.toLowerCase() === catchAllKey);
      if (fallbackPerm) {
        if (action === "view") return fallbackPerm.canView ?? true;
        if (action === "input") return fallbackPerm.canInput;
        if (action === "edit") return fallbackPerm.canEdit;
        if (action === "delete") return fallbackPerm.canDelete;
        if (action === "export") return fallbackPerm.canExport ?? false;
        if (action === "print") return fallbackPerm.canPrint ?? false;
      }
    }
    
    return false;
  };

  return { can, isAdmin, isLoading, error };
}
