import { cn } from '@/lib/utils';

export function Badge({ className, variant = 'default', children, ...props }) {
  const variants = {
    default:  'bg-blue-100 text-blue-700',
    success:  'bg-green-100 text-green-700',
    warning:  'bg-yellow-100 text-yellow-700',
    danger:   'bg-red-100 text-red-700',
    secondary:'bg-slate-100 text-slate-600',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
