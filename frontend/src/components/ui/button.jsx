import { cn } from '@/lib/utils';

export function Button({ className, variant = 'default', size = 'default', children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    default:   'bg-orange-600 text-white hover:bg-orange-700',
    outline:   'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    ghost:     'text-slate-700 hover:bg-slate-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  };

  const sizes = {
    default: 'h-9 px-4 py-2 text-sm',
    sm:      'h-7 px-3 text-xs',
    lg:      'h-11 px-6 text-base',
    icon:    'h-9 w-9',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
