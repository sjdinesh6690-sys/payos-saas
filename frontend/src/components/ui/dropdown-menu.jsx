import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      {typeof children === 'function'
        ? children({ open, setOpen })
        : children}
    </div>
  );
}

function DropdownMenuTrigger({ children, onClick, asChild }) {
  return (
    <div onClick={onClick} className="cursor-pointer">
      {children}
    </div>
  );
}

function DropdownMenuContent({ open, className, children, align = 'end', ...props }) {
  if (!open) return null;
  return (
    <div
      className={cn(
        'absolute z-50 mt-1 min-w-[10rem] rounded-md border border-slate-200 bg-white shadow-lg py-1',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({ className, children, onClick, disabled, variant, ...props }) {
  const isDestructive = variant === 'destructive';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left',
        isDestructive
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
          : 'text-slate-700 hover:bg-slate-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuSeparator({ className }) {
  return <div className={cn('my-1 h-px bg-slate-100', className)} />;
}

function DropdownMenuLabel({ className, children, ...props }) {
  return (
    <div className={cn('px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide', className)} {...props}>
      {children}
    </div>
  );
}

// Convenience wrapper that handles open state internally
function SimpleDropdown({ trigger, children, align = 'end' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      <DropdownMenuContent open={open} align={align}>
        <div onClick={() => setOpen(false)}>{children}</div>
      </DropdownMenuContent>
    </div>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  SimpleDropdown,
};
