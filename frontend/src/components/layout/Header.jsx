/**
 * Page Header — title, subtitle, optional icon + badge
 * Used at the top of every admin page.
 */
export default function Header({ title, subtitle, icon: Icon, badge, children }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3">
        {Icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--brand-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
          }}>
            <Icon size={18} style={{ color: 'var(--brand)' }} />
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {badge && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                background: 'var(--brand-light)', color: 'var(--brand)',
                border: '1px solid rgba(26,122,74,0.15)',
              }}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
