import { createContext, useContext, type ReactNode } from 'react';

type DashboardNav = {
  setPage: (key: string) => void;
};

const DashboardNavContext = createContext<DashboardNav | null>(null);

export function DashboardNavProvider({
  children,
  setPage,
}: {
  children: ReactNode;
  setPage: (key: string) => void;
}) {
  return (
    <DashboardNavContext.Provider value={{ setPage }}>{children}</DashboardNavContext.Provider>
  );
}

export function useDashboardNav(): DashboardNav {
  const ctx = useContext(DashboardNavContext);
  if (!ctx) {
    throw new Error('useDashboardNav debe usarse dentro de MainLayout');
  }
  return ctx;
}
