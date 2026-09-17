/** @type {import('tailwindcss').Config} */

/**
 * Every colour resolves to a CSS custom property holding raw RGB channels, so
 * `bg-slate-50/70` and `ring-brand-500/25` keep working while the whole palette
 * can be swapped for a dark theme by redefining variables in one place.
 *
 * See src/index.css for the values.
 */
const channel = (name) => `rgb(var(${name}) / <alpha-value>)`;

const ramp = (prefix, stops) =>
  Object.fromEntries(stops.map((stop) => [stop, channel(`--${prefix}-${stop}`)]));

const NEUTRAL_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const ACCENT_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const TINT_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800];

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // The neutral ramp carries both surfaces and text. In the dark theme it
        // is mirrored, so `text-slate-900` stays "the strongest text colour"
        // and `bg-slate-50` stays "the faintest surface" in either theme.
        slate: ramp('n', NEUTRAL_STOPS),
        brand: ramp('b', ACCENT_STOPS),
        red: ramp('r', TINT_STOPS),
        emerald: ramp('e', TINT_STOPS),
        amber: ramp('a', TINT_STOPS),
        purple: ramp('p', [50, 100, 200, 600, 700, 800]),

        // Named surfaces.
        canvas: channel('--canvas'),
        surface: channel('--canvas'),
        panel: channel('--panel'),
        raised: channel('--raised'),
        line: channel('--line'),
        'line-strong': channel('--line-strong'),

        /**
         * Solid action colours are separate from the hue ramps.
         *
         * A ramp stop has to serve as both a text colour and a button fill, and
         * those pull in opposite directions once the theme inverts. Splitting
         * them lets each be tuned for its own contrast requirement.
         */
        action: {
          DEFAULT: channel('--solid-brand'),
          hover: channel('--solid-brand-hover'),
        },
        destructive: {
          DEFAULT: channel('--solid-danger'),
          hover: channel('--solid-danger-hover'),
        },
        positive: {
          DEFAULT: channel('--solid-success'),
          hover: channel('--solid-success-hover'),
        },
        'on-solid': channel('--on-solid'),
      },

      spacing: {
        // A 60px application bar: taller than the stock 56px, which reads
        // cramped once the bar carries a search field and an account menu.
        15: '3.75rem',
      },

      fontFamily: {
        // The platform UI font. No webfont request, no download, and the app
        // reads like the operating system it is running on.
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Ubuntu', 'Cantarell', 'Noto Sans', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace'],
      },

      fontSize: {
        // A deliberate scale. Every size in the app comes from here rather than
        // from an arbitrary bracket value, so density stays consistent.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],   // 11
        xs: ['0.75rem', { lineHeight: '1.125rem' }],                              // 12
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],                             // 13
        base: ['0.875rem', { lineHeight: '1.375rem' }],                           // 14
        md: ['0.9375rem', { lineHeight: '1.5rem' }],                              // 15
        lg: ['1.0625rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em' }],  // 17
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em' }],    // 20
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],      // 24
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],// 30
      },

      borderRadius: {
        // One coherent scale: controls sit at `lg`, panels at `xl`.
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },

      boxShadow: {
        // Panels earn their separation from a hairline border, not a drop
        // shadow. Shadows are reserved for things that genuinely float.
        card: 'none',
        pop: '0 1px 2px rgb(var(--shadow) / 0.06), 0 12px 32px -8px rgb(var(--shadow) / 0.18)',
        overlay: '0 1px 3px rgb(var(--shadow) / 0.08), 0 24px 48px -12px rgb(var(--shadow) / 0.28)',
        focus: '0 0 0 3px rgb(var(--b-500) / 0.28)',
      },

      ringColor: { DEFAULT: channel('--b-500') },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.99)' },
          to: { opacity: '1', transform: 'none' },
        },
      },

      animation: {
        // Overlays only. Content still appears where it is, immediately.
        'fade-in': 'fade-in 120ms ease-out',
        'pop-in': 'pop-in 140ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
