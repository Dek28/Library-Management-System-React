import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, Library, RefreshCw, CloudDownload, Boxes, Users,
  BarChart3, GraduationCap, UsersRound, Settings, X, BookOpen,
  Bookmark, Receipt, Bell, ScrollText, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { P } from '../constants';

/**
 * Navigation model.
 *
 * Each entry declares the permissions that make it relevant; an item the
 * account cannot use is never rendered. This mirrors the server-side
 * authorization on every route, but does not replace it.
 */
const NAV_SECTIONS = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/catalog', label: 'Catalog', icon: Library, any: [P.RESOURCE_VIEW] },
      { to: '/circulation', label: 'Circulation', icon: RefreshCw, any: [P.LOAN_VIEW, P.LOAN_ISSUE, P.LOAN_VIEW_OWN] },
      { to: '/digital-library', label: 'Digital Library', icon: CloudDownload, any: [P.DIGITAL_VIEW] },
      { to: '/inventory', label: 'Inventory', icon: Boxes, any: [P.INVENTORY_VIEW] },
      { to: '/users', label: 'Users', icon: Users, any: [P.USER_VIEW] },
      { to: '/reports', label: 'Reports', icon: BarChart3, any: [P.REPORT_VIEW] },
      { to: '/clearance', label: 'Student Clearance', icon: GraduationCap, any: [P.CLEARANCE_VIEW, P.CLEARANCE_VIEW_OWN] },
      { to: '/reading-groups', label: 'Student Groups', icon: UsersRound, any: [P.GROUP_VIEW, P.GROUP_VIEW_OWN] },
      { to: '/settings', label: 'Settings', icon: Settings, any: [P.SETTING_VIEW] },
    ],
  },
  {
    title: 'My library',
    // Borrower-facing shortcuts; hidden from accounts that manage the desk.
    hideWhenAny: [P.LOAN_ISSUE, P.USER_VIEW],
    items: [
      { to: '/my/borrowing', label: 'My Borrowing', icon: BookOpen, any: [P.LOAN_VIEW_OWN] },
      { to: '/my/reservations', label: 'My Reservations', icon: Bookmark, any: [P.RESERVATION_CREATE_OWN] },
      { to: '/my/fines', label: 'My Fines', icon: Receipt, any: [P.FINE_VIEW_OWN] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/administration/fines', label: 'Fines', icon: Receipt, any: [P.FINE_VIEW] },
      { to: '/administration/reservations', label: 'Reservations', icon: Bookmark, any: [P.RESERVATION_VIEW] },
      { to: '/administration/roles', label: 'Roles & Permissions', icon: ShieldCheck, any: [P.ROLE_VIEW] },
      { to: '/administration/audit-logs', label: 'Audit Logs', icon: ScrollText, any: [P.AUDIT_VIEW] },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

/**
 * The rail sits on the app canvas rather than on a dark slab, separated by a
 * single hairline. Navigation is a reference surface, not a feature of the
 * design, so it recedes and lets the working area carry the contrast.
 */
export default function Sidebar({ open, onClose }) {
  const permissions = useAuthStore((state) => state.permissions);
  const settings = useAuthStore((state) => state.settings);

  const allowed = (item) => !item.any || item.any.some((p) => permissions.includes(p));

  const sections = NAV_SECTIONS
    .filter((section) => !section.hideWhenAny || !section.hideWhenAny.some((p) => permissions.includes(p)))
    .map((section) => ({ ...section, items: section.items.filter(allowed) }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile scrim */}
      <div
        className={clsx(
          'fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-line bg-panel',
          'transition-transform duration-200 ease-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-15 shrink-0 items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-action text-on-solid">
              <Library className="h-[17px] w-[17px]" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold tracking-[-0.01em] text-slate-900">ULMS</span>
              <span className="block truncate text-2xs text-slate-500">
                {settings?.institution?.libraryName || 'University Library'}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-2">
          {sections.map((section, index) => (
            <div key={section.title || index}>
              {section.title && <p className="nav-section-label">{section.title}</p>}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) => clsx('nav-link', isActive && 'nav-link-active')}
                    >
                      <item.icon className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <p className="text-2xs text-slate-400">ULMS v1.0</p>
        </div>
      </aside>
    </>
  );
}
