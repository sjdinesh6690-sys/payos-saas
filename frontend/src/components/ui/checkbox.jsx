import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Checkbox = forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      'h-4 w-4 shrink-0 rounded border border-slate-300 bg-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      checked && 'bg-blue-600 border-blue-600 text-white',
      className
    )}
    {...props}
  >
    {checked && (
      <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 mx-auto">
        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
