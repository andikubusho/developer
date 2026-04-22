import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { startOfMonth, endOfMonth, isThisMonth } from "date-fns";

interface GlobalPeriodContextType {
  globalMonth: number;
  globalYear: number;
  setGlobalMonth: (month: number) => void;
  setGlobalYear: (year: number) => void;
  startDate: Date;
  endDate: Date;
  isCurrentMonth: boolean;
}

const GlobalPeriodContext = createContext<GlobalPeriodContextType | null>(null);

export function GlobalPeriodProvider({ children }: { children: ReactNode }) {
  const currentDate = new Date();
  
  // Default to current month and year
  const [globalMonth, setGlobalMonth] = useState<number>(currentDate.getMonth());
  const [globalYear, setGlobalYear] = useState<number>(currentDate.getFullYear());

  const { startDate, endDate, isCurrentMonth } = useMemo(() => {
    // Determine the active date boundary based on the selected month/year
    const activeDate = new Date(globalYear, globalMonth, 1);
    return {
      startDate: startOfMonth(activeDate),
      endDate: endOfMonth(activeDate),
      isCurrentMonth: isThisMonth(activeDate)
    };
  }, [globalMonth, globalYear]);

  return (
    <GlobalPeriodContext.Provider
      value={{
        globalMonth,
        globalYear,
        setGlobalMonth,
        setGlobalYear,
        startDate,
        endDate,
        isCurrentMonth
      }}
    >
      {children}
    </GlobalPeriodContext.Provider>
  );
}

export function useGlobalPeriod() {
  const context = useContext(GlobalPeriodContext);
  if (!context) {
    throw new Error("useGlobalPeriod must be used within a GlobalPeriodProvider");
  }
  return context;
}
