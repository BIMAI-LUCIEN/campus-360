---
name: Campus Admin
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#005a82'
  on-tertiary: '#ffffff'
  tertiary-container: '#0074a6'
  on-tertiary-container: '#e4f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 240px
  container-padding: 32px
  gutter: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for high-utility administrative environments. It balances the friendly, academic heritage of a campus environment with the rigorous functional requirements of a professional SaaS dashboard. The aesthetic is **Corporate Modern** with a slight **Tactile** influence to ensure interactive elements feel robust and reliable.

The target audience consists of university registrars, department heads, and system administrators who require clarity and speed. The UI evokes a sense of organized efficiency and professional trust, utilizing generous whitespace to manage information density without overwhelming the user.

## Colors
This design system utilizes a high-contrast primary blue to drive action and signal importance. The background uses a warm off-white (`#fff8f1`) to reduce eye strain during long working sessions and provide a subtle academic "parchment" undertone that distinguishes it from generic enterprise software.

- **Primary (#2563eb):** Used for primary actions, active states, and key brand moments.
- **Secondary (#475569):** Used for navigation icons and secondary typography.
- **Surface:** The warm base layer is contrasted with pure white cards to create a clear "layering" effect.
- **Success/Warning/Error:** Standard utility colors (Green 600, Amber 500, Red 600) are used with increased saturation to ensure accessibility on the warm background.

## Typography
The typography system pairs the geometric friendliness of **Plus Jakarta Sans** for headings with the systematic legibility of **Inter** for data-heavy body content. 

- **Headings:** Use Plus Jakarta Sans with tighter letter-spacing for a modern, "locked-in" feel.
- **Body:** Inter is the workhorse font, optimized for readability in tables and lists.
- **Information Density:** The "Body-sm" and "Label-md" roles are critical for administrative panels, allowing for dense data presentation without sacrificing clarity.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid model**. A permanent 240px sidebar anchors the left, while the main content area occupies a fluid container with a maximum width of 1600px to maintain line-length readability.

- **Grid:** 12-column system with 24px gutters.
- **Density:** Elements use an 8px spacing scale, but compact views (like data tables) may drop to 4px internal padding to increase information density.
- **Sidebar:** The sidebar uses a slightly darker tint of the neutral color or a pure white to contrast against the `#fff8f1` canvas.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and crisp **Ambient Shadows**. 

1. **Level 0 (Background):** The `#fff8f1` surface.
2. **Level 1 (Cards/Sidebar):** Pure `#ffffff` with a subtle 1px border (`#e2e8f0`) and a soft, low-opacity shadow (Y: 2, Blur: 4, Opacity: 0.05).
3. **Level 2 (Modals/Dropdowns):** Pure `#ffffff` with a more pronounced shadow (Y: 8, Blur: 16, Opacity: 0.1) to clearly separate floating elements from the workspace.

Avoid heavy blurs or glassmorphism to maintain the professional, utilitarian focus of the dashboard.

## Shapes
This design system uses a **Soft (0.25rem)** roundedness level. This choice provides a professional, geometric look that maximizes screen real estate.

- **Base elements:** (Inputs, Buttons, Cards) use 4px (`0.25rem`) corner radius.
- **Large elements:** (Modals, Feature Sections) use 8px (`0.5rem`).
- **Interactive indicators:** Selection states in the sidebar use a subtle vertical pill or a 4px rounded highlight.

## Components
- **Buttons:** Primary buttons use `#2563eb` with white text. High-density views should use "Compact" button variants (32px height) instead of the standard 40px.
- **Data Tables:** The core of the admin experience. Use `body-sm` for row content. Rows should have a subtle hover state (`#f1f5f9`) and 1px horizontal borders only.
- **Input Fields:** Use a white background with a 1px border. Focus states must use a 2px primary blue ring.
- **Chips/Badges:** Small, high-contrast labels for status (e.g., "Active", "Pending"). Use a background-tinted version of the status color with darkened text for legibility.
- **Sidebar Nav:** Items should have a 12px horizontal padding. The active state is indicated by a primary blue vertical bar on the left edge and a subtle blue tint background.
- **Cards:** Use cards to group logical sections. Each card should have a 16px or 24px internal padding depending on density requirements.