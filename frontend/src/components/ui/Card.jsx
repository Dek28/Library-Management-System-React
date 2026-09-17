import clsx from 'clsx';
import { Link } from 'react-router-dom';

export default function Card({ title, subtitle, actions, footer, className, bodyClassName, children, noPadding = false }) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="card-header">
          <div className="min-w-0">
            {title && <h2 className="card-title truncate">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(!noPadding && 'p-5', bodyClassName)}>{children}</div>
      {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
    </section>
  );
}

/** Accent dot colours, used only where the tone carries meaning. */
const TONE_DOTS = {
  blue: 'bg-brand-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  purple: 'bg-purple-600',
  slate: 'bg-slate-300',
};

/**
 * Dashboard metric tile: label, value, and an optional link.
 *
 * The number is the point, so it gets the weight and the room. The tone shows
 * as a small dot beside the label rather than a bar down the side — enough to
 * group tiles by meaning without drawing a frame around every figure.
 *
 * Values are pre-aggregated by the API. The tile never computes anything.
 */
export function StatCard({ label, value, tone = 'slate', to, linkLabel = 'View all', hint, loading = false }) {
  return (
    <div className="card group px-5 py-4 transition-colors duration-100 hover:border-line-strong">
      <div className="flex items-center gap-2">
        <span
          className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOTS[tone] || TONE_DOTS.slate)}
          aria-hidden="true"
        />
        <p className="truncate text-xs font-medium uppercase tracking-[0.05em] text-slate-500">{label}</p>
      </div>

      {loading ? (
        <div className="skeleton mt-3 h-8 w-24" />
      ) : (
        <p className="mt-2 text-3xl font-semibold leading-none text-slate-900 tabular">
          {value}
        </p>
      )}

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}

      {to && (
        <Link
          to={to}
          className="mt-3 inline-block text-sm font-medium text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/** Label/value row used on detail pages. */
export function DetailRow({ label, children, className }) {
  return (
    <div className={clsx('flex gap-4 border-b border-line py-2.5 last:border-b-0', className)}>
      <dt className="w-40 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-base font-medium text-slate-800">{children ?? '-'}</dd>
    </div>
  );
}
