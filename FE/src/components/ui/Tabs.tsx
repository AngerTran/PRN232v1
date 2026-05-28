import { createContext, useContext, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface TabsContextValue {
  active: string;
  setActive: (val: string) => void;
}

const TabsCtx = createContext<TabsContextValue>({ active: '', setActive: () => {} });

export function Tabs({ value, onChange, children, className }: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <TabsCtx.Provider value={{ active: value, setActive: onChange }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center gap-0.5 bg-muted p-1 rounded-xl', className)}>
      {children}
    </div>
  );
}

export function Tab({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { active, setActive } = useContext(TabsCtx);
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={clsx(
        'px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-150',
        isActive
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { active } = useContext(TabsCtx);
  if (active !== value) return null;
  return <div className={className}>{children}</div>;
}
