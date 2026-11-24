import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          strong: "hsl(var(--primary-strong))",
          soft: "hsl(var(--primary-soft))",
          "soft-foreground": "hsl(var(--primary-soft-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
          "soft-foreground": "hsl(var(--success-soft-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
          "soft-foreground": "hsl(var(--warning-soft-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          soft: "hsl(var(--danger-soft))",
          "soft-foreground": "hsl(var(--danger-soft-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          soft: "hsl(var(--info-soft))",
          "soft-foreground": "hsl(var(--info-soft-foreground))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          accent: {
            DEFAULT: "hsl(var(--sidebar-accent))",
            foreground: "hsl(var(--sidebar-accent-foreground))",
          },
        },

        // ── Design tokens (additive; see index.css) ──
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))",
          soft: "hsl(var(--highlight-soft))",
        },
        page: "hsl(var(--page))",
        scrim: "hsl(var(--scrim))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          subtle: "hsl(var(--surface-subtle))",
          muted: "hsl(var(--surface-muted))",
        },
        line: {
          DEFAULT: "hsl(var(--line))",
          card: "hsl(var(--line-card))",
          input: "hsl(var(--line-input))",
        },
        ink: {
          1: "hsl(var(--ink-1))",
          2: "hsl(var(--ink-2))",
          3: "hsl(var(--ink-3))",
          4: "hsl(var(--ink-4))",
          5: "hsl(var(--ink-5))",
        },
        "tone-ok": {
          soft: "hsl(var(--tone-ok-soft))",
          fg: "hsl(var(--tone-ok-fg))",
          border: "hsl(var(--tone-ok-border))",
        },
        "tone-warn": {
          soft: "hsl(var(--tone-warn-soft))",
          fg: "hsl(var(--tone-warn-fg))",
        },
        "tone-bad": {
          soft: "hsl(var(--tone-bad-soft))",
          fg: "hsl(var(--tone-bad-fg))",
          border: "hsl(var(--tone-bad-border))",
          solid: "hsl(var(--tone-bad-solid))",
        },
        "tone-info": {
          soft: "hsl(var(--tone-info-soft))",
          fg: "hsl(var(--tone-info-fg))",
        },
        "tone-neutral": {
          soft: "hsl(var(--tone-neutral-soft))",
          fg: "hsl(var(--tone-neutral-fg))",
        },
        "tone-highlight": {
          soft: "hsl(var(--tone-highlight-soft))",
          fg: "hsl(var(--tone-highlight-fg))",
        },
        "tone-purple": {
          soft: "hsl(var(--tone-purple-soft))",
          fg: "hsl(var(--tone-purple-fg))",
        },
        "tone-pink": {
          soft: "hsl(var(--tone-pink-soft))",
          fg: "hsl(var(--tone-pink-fg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        control: "8px",
        card: "12px",
        pill: "12px",
      },
      boxShadow: {
        control: "0 1px 2px rgba(16, 24, 40, 0.08)",
      },
      width: {
        control: "40px",
      },
      height: {
        control: "40px",
        "control-sm": "32px",
        "control-tab": "42px",
        "control-seg": "34px",
      },
      minHeight: {
        control: "40px",
        "control-sm": "32px",
        "control-tab": "42px",
        "control-seg": "34px",
      },
      fontSize: {
        caption: ["12px", { lineHeight: "16px" }],
        "caption-lg": ["12.5px", { lineHeight: "16px" }],
        small: ["13px", { lineHeight: "18px" }],
        body: ["14px", { lineHeight: "20px" }],
        "card-title": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "page-title": ["26px", { lineHeight: "32px", fontWeight: "600", letterSpacing: "-0.02em" }],
        kpi: ["28px", { lineHeight: "34px", fontWeight: "600", letterSpacing: "-0.02em" }],
      },
      fontFamily: {
        ui: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        data: ['"JetBrains Mono"', "ui-monospace", "monospace"],
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
    },
  },
  plugins: [tailwindcssAnimate],
};
