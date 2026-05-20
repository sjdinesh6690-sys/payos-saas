import { cn } from '@/lib/utils';

export function Table({ className, children, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full text-sm', className)} {...props}>{children}</table>
    </div>
  );
}
export function TableHeader({ children, ...props }) {
  return <thead {...props}>{children}</thead>;
}
export function TableBody({ children, ...props }) {
  return <tbody {...props}>{children}</tbody>;
}
export function TableRow({ className, children, ...props }) {
  return (
    <tr className={cn('border-b border-slate-200 hover:bg-slate-50 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}
export function TableHead({ className, children, ...props }) {
  return (
    <th className={cn('h-10 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide', className)} {...props}>
      {children}
    </th>
  );
}
export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn('px-4 py-3 text-slate-700', className)} {...props}>
      {children}
    </td>
  );
}
