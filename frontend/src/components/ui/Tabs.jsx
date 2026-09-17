import clsx from 'clsx';

/**
 * Underlined tab bar.
 * `tabs`: { key, label, count? }. Rendered as real buttons with `role="tab"`
 * so keyboard and screen-reader users get the expected semantics.
 */
export default function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={clsx('border-b border-line', className)} role="tablist">
      <div className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.key === value;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.key)}
              className={clsx(
                'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-2.5 pt-2 text-base font-medium transition-colors duration-100',
                active
                  ? 'border-brand-600 text-slate-900'
                  : 'border-transparent text-slate-500 hover:border-line-strong hover:text-slate-800',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={clsx(
                  'rounded px-1.5 py-0.5 text-2xs font-semibold tabular',
                  active ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500',
                )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
