import { createContext, useContext, useState } from "react";

interface DeskContextType {
  deskIdx: number;
  setDeskIdx: (idx: number) => void;
}

const DeskContext = createContext<DeskContextType | undefined>(undefined);

const STORAGE_KEY = "gm_desk_idx";

export function DeskProvider({ children }: { children: React.ReactNode }) {
  const [deskIdx, setDeskIdxState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : 0;
  });

  const setDeskIdx = (idx: number) => {
    localStorage.setItem(STORAGE_KEY, String(idx));
    setDeskIdxState(idx);
  };

  return (
    <DeskContext.Provider value={{ deskIdx, setDeskIdx }}>
      {children}
    </DeskContext.Provider>
  );
}

export function useDesk(): DeskContextType {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("useDesk must be used within DeskProvider");
  return ctx;
}
