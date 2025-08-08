/**
 * Design Token System
 * A composable theming system that allows for quick design changes
 * between different learning engines and applications
 */

export interface DesignTokens {
  // Colors
  colors: {
    // Primary brand colors
    primary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    // Secondary brand colors
    secondary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    // Semantic colors
    success: {
      light: string;
      main: string;
      dark: string;
    };
    warning: {
      light: string;
      main: string;
      dark: string;
    };
    error: {
      light: string;
      main: string;
      dark: string;
    };
    info: {
      light: string;
      main: string;
      dark: string;
    };
    // Neutral colors
    gray: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    // Progress colors (for learning grids)
    progress: {
      notStarted: string;
      learning: string;
      practicing: string;
      improving: string;
      nearMastery: string;
      mastered: string;
    };
    // Background colors
    background: {
      primary: string;
      secondary: string;
      paper: string;
      overlay: string;
    };
    // Text colors
    text: {
      primary: string;
      secondary: string;
      disabled: string;
      inverse: string;
    };
  };

  // Spacing
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };

  // Typography
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
      '5xl': string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };

  // Border radius
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };

  // Shadows
  shadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };

  // Transitions
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };

  // Breakpoints
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };

  // Component-specific tokens
  components: {
    grid: {
      maxSize: string;
      cellSize: {
        sm: string;
        md: string;
        lg: string;
      };
      gap: string;
    };
    button: {
      height: {
        sm: string;
        md: string;
        lg: string;
      };
      padding: {
        sm: string;
        md: string;
        lg: string;
      };
    };
    card: {
      padding: string;
      borderRadius: string;
      shadow: string;
    };
  };
}

// Default Math Learning Theme
export const mathLearningTokens: DesignTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
    },
    success: {
      light: '#86efac',
      main: '#22c55e',
      dark: '#16a34a',
    },
    warning: {
      light: '#fde047',
      main: '#eab308',
      dark: '#ca8a04',
    },
    error: {
      light: '#fca5a5',
      main: '#ef4444',
      dark: '#dc2626',
    },
    info: {
      light: '#93c5fd',
      main: '#3b82f6',
      dark: '#2563eb',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    progress: {
      notStarted: '#e5e7eb',
      learning: '#bfdbfe',
      practicing: '#fb923c',
      improving: '#fde047',
      nearMastery: '#a3e635',
      mastered: '#22c55e',
    },
    background: {
      primary: 'linear-gradient(to bottom, #eff6ff, #ffffff)',
      secondary: '#ffffff',
      paper: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      disabled: '#9ca3af',
      inverse: '#ffffff',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  components: {
    grid: {
      maxSize: '400px', // Reduced from 55vh to match frontend
      cellSize: {
        sm: '1.5rem',
        md: '2rem',
        lg: '2.5rem',
      },
      gap: '0.125rem', // Smaller gap for tighter grid
    },
    button: {
      height: {
        sm: '2rem',
        md: '2.5rem',
        lg: '3rem',
      },
      padding: {
        sm: '0.5rem 1rem',
        md: '0.75rem 1.5rem',
        lg: '1rem 2rem',
      },
    },
    card: {
      padding: '1rem',
      borderRadius: '0.5rem',
      shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
  },
};

// Language Learning Theme Example
export const languageLearningTokens: DesignTokens = {
  ...mathLearningTokens,
  colors: {
    ...mathLearningTokens.colors,
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    secondary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
  },
};

// Coding Learning Theme Example
export const codingLearningTokens: DesignTokens = {
  ...mathLearningTokens,
  colors: {
    ...mathLearningTokens.colors,
    primary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    background: {
      primary: '#1e1e1e',
      secondary: '#2d2d30',
      paper: '#252526',
      overlay: 'rgba(0, 0, 0, 0.8)',
    },
    text: {
      primary: '#d4d4d4',
      secondary: '#9ca3af',
      disabled: '#6b7280',
      inverse: '#1e1e1e',
    },
  },
  typography: {
    ...mathLearningTokens.typography,
    fontFamily: {
      sans: mathLearningTokens.typography.fontFamily.sans,
      mono: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
    },
  },
};

// Active theme (can be switched dynamically)
let activeTokens: DesignTokens = mathLearningTokens;

export const setActiveTokens = (tokens: DesignTokens) => {
  activeTokens = tokens;
  // Optionally trigger a re-render or update CSS variables
  updateCSSVariables(tokens);
};

export const getActiveTokens = (): DesignTokens => activeTokens;

// Helper function to convert tokens to CSS variables
export const updateCSSVariables = (tokens: DesignTokens) => {
  const root = document.documentElement;
  
  // Update color variables
  Object.entries(tokens.colors.primary).forEach(([key, value]) => {
    root.style.setProperty(`--color-primary-${key}`, value);
  });
  
  Object.entries(tokens.colors.secondary).forEach(([key, value]) => {
    root.style.setProperty(`--color-secondary-${key}`, value);
  });
  
  // Update spacing variables
  Object.entries(tokens.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
  
  // Update typography variables
  Object.entries(tokens.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value);
  });
  
  // Update component variables
  root.style.setProperty('--grid-max-size', tokens.components.grid.maxSize);
  root.style.setProperty('--grid-gap', tokens.components.grid.gap);
};

// Token hooks for React components
export const useDesignTokens = (): DesignTokens => {
  return getActiveTokens();
};