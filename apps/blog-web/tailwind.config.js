import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["media"], // 시스템 설정에 따른 자동 다크모드 (class 방식 비활성화)
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    // 요구사항 문서의 브레이크포인트 반영
    screens: {
      'xs': '475px',    // 작은 모바일
      'sm': '640px',    // 큰 모바일
      'md': '768px',    // 태블릿
      'lg': '1024px',   // 작은 노트북
      'xl': '1280px',   // 데스크톱
      '2xl': '1536px'   // 큰 데스크톱
    },
    extend: {
      colors: {
        // Primary brand colors - 요구사항 문서 기준
        brand: {
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          500: "var(--color-primary-500)",
          900: "var(--color-primary-900)",
        },
        // Accent colors  
        "accent-primary": "var(--color-accent-primary)",
        "accent-secondary": "var(--color-accent-secondary)", 
        "accent-success": "var(--color-accent-success)",
        "accent-warning": "var(--color-accent-warning)",
        "accent-error": "var(--color-accent-error)",
        
        // Semantic colors
        "custom-background": "var(--color-background)",
        surface: "var(--color-surface)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "custom-border": "var(--color-border)",

        // shadcn/ui colors (CSS variables 사용)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'var(--color-text-primary)',
            '[class~="lead"]': {
              color: 'var(--color-text-secondary)',
            },
            a: {
              color: 'var(--color-accent-primary)',
              textDecoration: 'underline',
              fontWeight: '500',
              '&:hover': {
                color: 'var(--color-accent-primary)',
                textDecoration: 'none',
              },
            },
            strong: {
              color: 'var(--color-text-primary)',
              fontWeight: '600',
            },
            'ol > li::before': {
              color: 'var(--color-text-secondary)',
            },
            'ul > li::before': {
              backgroundColor: 'var(--color-text-secondary)',
            },
            hr: {
              borderColor: 'var(--color-border)',
            },
            blockquote: {
              color: 'var(--color-text-secondary)',
              borderLeftColor: 'var(--color-border)',
            },
            'h1, h2, h3, h4, h5, h6': {
              color: 'var(--color-text-primary)',
            },
            'figure figcaption': {
              color: 'var(--color-text-secondary)',
            },
            code: {
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface)',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontWeight: '500',
            },
            'a code': {
              color: 'var(--color-accent-primary)',
            },
            pre: {
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '0.5rem',
              padding: '1.5rem',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: 0,
            },
            thead: {
              color: 'var(--color-text-primary)',
              borderBottomColor: 'var(--color-border)',
            },
            'tbody tr': {
              borderBottomColor: 'var(--color-border)',
            },
            'thead th': {
              fontWeight: '600',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
}