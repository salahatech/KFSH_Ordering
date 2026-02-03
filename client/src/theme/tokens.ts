export const tokens = {
  typography: {
    fontFamily: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      arabic: "'IBM Plex Sans Arabic', 'Tajawal', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: '0.6875rem',    // 11px
      sm: '0.75rem',      // 12px
      base: '0.875rem',   // 14px
      md: '1rem',         // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '2rem',      // 32px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.625,
    },
    letterSpacing: {
      tight: '-0.01em',
      normal: '0',
      wide: '0.01em',
    },
  },

  colors: {
    brand: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      primaryLight: '#3b82f6',
      primarySoft: '#eff6ff',
    },
    neutrals: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    semantic: {
      success: '#22c55e',
      successLight: '#f0fdf4',
      successDark: '#166534',
      warning: '#f59e0b',
      warningLight: '#fffbeb',
      warningDark: '#92400e',
      danger: '#ef4444',
      dangerLight: '#fef2f2',
      dangerDark: '#991b1b',
      info: '#0ea5e9',
      infoLight: '#f0f9ff',
      infoDark: '#0369a1',
    },
    special: {
      teal: '#14b8a6',
      tealLight: '#f0fdfa',
      tealDark: '#0d9488',
      purple: '#8b5cf6',
      purpleLight: '#f5f3ff',
      purpleDark: '#6d28d9',
      pink: '#ec4899',
      pinkLight: '#fdf2f8',
      pinkDark: '#be185d',
    },
  },

  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    8: '2rem',        // 32px
    10: '2.5rem',     // 40px
    12: '3rem',       // 48px
    16: '4rem',       // 64px
  },

  layout: {
    containerWidth: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1400px',
    },
    pagePadding: '1.5rem',
    sidebarWidth: '260px',
    headerHeight: '64px',
  },

  borders: {
    color: '#e2e8f0',
    colorLight: '#f1f5f9',
    colorDark: '#cbd5e1',
    width: '1px',
  },

  radii: {
    none: '0',
    sm: '4px',
    md: '6px',
    base: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },

  components: {
    button: {
      height: {
        sm: '32px',
        md: '40px',
        lg: '48px',
      },
      padding: {
        sm: '0.25rem 0.75rem',
        md: '0.5rem 1rem',
        lg: '0.75rem 1.5rem',
      },
    },
    input: {
      height: {
        sm: '32px',
        md: '40px',
        lg: '48px',
      },
      padding: '0.5rem 0.75rem',
    },
    table: {
      rowHeight: '52px',
      headerHeight: '44px',
      cellPadding: '0.75rem 1rem',
    },
    card: {
      padding: {
        sm: '1rem',
        md: '1.25rem',
        lg: '1.5rem',
      },
    },
    modal: {
      width: {
        sm: '400px',
        md: '560px',
        lg: '720px',
        xl: '960px',
      },
    },
  },

  transitions: {
    fast: '0.1s ease',
    base: '0.15s ease',
    slow: '0.3s ease',
  },

  zIndex: {
    dropdown: 100,
    sticky: 200,
    modal: 300,
    popover: 400,
    tooltip: 500,
    toast: 600,
  },
};

export type Tokens = typeof tokens;
export default tokens;
