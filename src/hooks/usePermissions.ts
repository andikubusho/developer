import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to check if the current user can view all data for a specific menu key.
 * This is primarily used for marketing data isolation (Leads, Sales, etc.)
 */
export const useCanViewAll = (menuKey: string) => {
  const { profile } = useAuth();
  
  // Admins always see everything
  if (profile?.role === 'admin') return true;
  
  // Check dynamic permissions from the database
  return !!profile?.permissions?.[menuKey]?.viewAll;
};
