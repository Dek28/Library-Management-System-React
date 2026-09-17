import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Library } from 'lucide-react';
import { adminApi } from '../api/endpoints';

/**
 * Two-panel shell for the unauthenticated screens: institution branding on the
 * left, the form on the right. On small screens the branding collapses to a
 * compact header so the form stays above the fold.
 *
 * The branding panel is a single deep field with one soft light source. It
 * carries the institution's name and nothing that competes with the form.
 */
export default function AuthLayout() {
  const { data: settings } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: adminApi.publicSettings,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const institution = settings?.institution;

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <div
        className="relative isolate flex flex-col justify-center gap-5 overflow-hidden px-6 py-8
          lg:w-[46%] lg:gap-8 lg:px-14 lg:py-16"
        style={{ backgroundColor: 'rgb(11 18 32)' }}
      >
        {/* One diffuse light behind the type, and a fine grid to give the field
            some structure. Both are decorative and inert. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 -z-10 h-[26rem] w-[26rem] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(37 90 232 / 0.55), transparent 68%)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at 30% 40%, black, transparent 75%)',
          }}
        />

        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-action text-on-solid">
            <Library className="h-[19px] w-[19px]" aria-hidden="true" />
          </span>
          <span className="text-md font-semibold tracking-[-0.01em] text-white">ULMS</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-xl font-semibold leading-[1.15] text-white lg:text-3xl">
            {institution?.libraryName || 'University Library'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55 lg:mt-3 lg:text-base">
            {institution?.universityName || 'University Library Management System'}
          </p>
        </div>

        {/* The feature list is context, not instruction: on a phone it would
            push the form below the fold, so it stays for wide screens only. */}
        <dl className="hidden max-w-md space-y-4 border-t border-white/10 pt-7 lg:block">
          {[
            ['Catalogue', 'Books, journals, theses and every physical copy'],
            ['Circulation', 'Borrowing, returns, renewals and reservations'],
            ['Your account', 'Loans, fines and library clearance'],
          ].map(([term, detail]) => (
            <div key={term} className="flex gap-3">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/25" aria-hidden="true" />
              <div>
                <dt className="text-sm font-medium text-white/90">{term}</dt>
                <dd className="mt-0.5 text-sm text-white/45">{detail}</dd>
              </div>
            </div>
          ))}
        </dl>

        <p className="hidden text-2xs text-white/35 lg:block lg:absolute lg:bottom-7 lg:left-14">
          © {new Date().getFullYear()} {institution?.libraryName || 'University Library'}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-12 lg:px-10">
        <div className="w-full max-w-[384px]">
          <Outlet context={{ institution }} />
        </div>
      </div>
    </div>
  );
}
