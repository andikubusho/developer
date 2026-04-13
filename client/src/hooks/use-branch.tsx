import React, { createContext, useContext, useState, useEffect } from "react";
import { type Branch } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useAuth } from "./use-auth";

interface BranchContextType {
  branches: Branch[];
  selectedBranchId: number | null;
  setSelectedBranchId: (id: number) => void;
  selectedBranch: Branch | undefined;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextType | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedBranchId, setSelectedBranchIdState] = useState<number | null>(null);

  const { data: allBranches = [], isLoading } = useQuery<Branch[]>({
    queryKey: [api.branches.list.path],
    enabled: !!user,
  });

  const branches = React.useMemo(() => {
    if (!user) return [];
    // Jika user punya daftar cabang spesifik yang diizinkan
    if (user.accessibleBranchIds && user.accessibleBranchIds.length > 0) {
      return allBranches.filter(b => user.accessibleBranchIds.includes(b.id));
    }
    // Jika superadmin (username 'admin' atau tidak ada batasan branchId)
    if (user.username === 'admin' || !user.branchId) {
      return allBranches;
    }

    return [];
  }, [allBranches, user]);

  // Initialize selected branch from user's assigned branch or localStorage
  useEffect(() => {
    if (user && branches.length > 0) {
      const savedBranchId = localStorage.getItem("selectedBranchId");
      if (savedBranchId) {
        const id = parseInt(savedBranchId);
        // Only set if the saved ID is still in the authorized branches list
        if (branches.find(b => b.id === id)) {
          setSelectedBranchIdState(id);
          return;
        }
      }

      // Default to first authorized branch if no valid selection
      setSelectedBranchIdState(branches[0].id);
    } else if (branches.length === 0) {
      setSelectedBranchIdState(null);
    }
  }, [user, branches]);

  const setSelectedBranchId = (id: number) => {
    setSelectedBranchIdState(id);
    localStorage.setItem("selectedBranchId", id.toString());
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        setSelectedBranchId,
        selectedBranch,
        isLoading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
