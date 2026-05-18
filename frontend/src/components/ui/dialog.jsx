import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-10 w-full max-w-lg mx-4">
        {children}
      </div>
    </div>
  );
}

function DialogContent({ className, children, onClose, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex items-center justify-between px-6 py-4 border-b border-slate-100', className)} {...props}>
      {children}
    </div>
  );
}

function DialogTitle({ className, children, ...props }) {
  return (
    <h2 className={cn('text-lg font-semibold text-slate-900', className)} {...props}>
      {children}
    </h2>
  );
}

function DialogDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-sm text-slate-500 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

function DialogFooter({ className, children, ...props }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100', className)} {...props}>
      {children}
    </div>
  );
}

function DialogClose({ onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="text-slate-400 hover:text-slate-600 transition-colors"
    >
      <X size={18} />
    </button>
  );
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose };
