import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * DataFilters — a reusable search + filter bar.
 *
 * Props:
 *   search        string           Current search text
 *   onSearch      fn(value)        Called when search changes
 *   filters       FilterDef[]      Array of filter definitions
 *   values        object           Current filter values { key: value }
 *   onChange      fn(key, value)   Called when a filter changes
 *   className     string
 *
 * FilterDef:
 *   { key, label, options: [{ label, value }] }
 */
export default function DataFilters({ search = '', onSearch, filters = [], values = {}, onChange, className }) {
  const hasActiveFilters = search || filters.some(f => values[f.key] && values[f.key] !== '');

  const clearAll = () => {
    onSearch?.('');
    filters.forEach(f => onChange?.(f.key, ''));
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Search box */}
      {onSearch && (
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search…"
            className="pl-8 h-9 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Dynamic filter selects */}
      {filters.map(f => (
        <select
          key={f.key}
          value={values[f.key] || ''}
          onChange={e => onChange?.(f.key, e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{f.label}</option>
          {f.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );
}
