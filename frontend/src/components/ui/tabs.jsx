import { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext(null);

function Tabs({ value, onValueChange, defaultValue, children, className }) {
  const [internal, setInternal] = useState(defaultValue || '');
  const active = value !== undefined ? value : internal;
  const setActive = onValueChange || setInternal;

  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }) {
  return (
    <div className={cn('flex gap-1 rounded-lg bg-slate-100 p-1', className)}>
      {children}
    </div>
  );
}

function TabsTrigger({ value, children, className }) {
  const { active, setActive } = useContext(TabsContext);
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={() => setActive(value)}
      className={cn(
        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
        isActive
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900',
        className
      )}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, children, className }) {
  const { active } = useContext(TabsContext);
  if (active !== value) return null;
  return <div className={className}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
