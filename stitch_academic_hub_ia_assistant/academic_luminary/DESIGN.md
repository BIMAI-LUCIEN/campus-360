---
name: Academic Luminary
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#712ae2'
  on-secondary: '#ffffff'
  secondary-container: '#8a4cfc'
  on-secondary-container: '#fffbff'
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
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 20px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for the high-achieving modern student. The brand personality is **Academic yet Innovative**—it bridges the gap between traditional institutional reliability and the cutting-edge digital tools students use daily. The visual direction leans into **Modern Glassmorphism**, utilizing translucent layers and deep background blurs to create a sense of physical depth and sophisticated hierarchy.

The UI should evoke a sense of **calm focus and intellectual clarity**. By pairing a minimalist layout with high-fidelity glass effects, the system feels premium and "pro-level," treating a student's education with the same professional weight as a high-end fintech or SaaS platform.

## Colors

The palette is centered around **Electric Indigo**, a vibrant yet professional blue that signals intelligence and trust. 

- **Primary (#2563EB):** Used for main actions, active states, and brand moments.
- **Secondary (#7C3AED):** A deep violet used for progress indicators and achievement-related UI.
- **Surface Strategy:** In Light Mode, use ultra-clean whites (#FFFFFF) with subtle cool-grey borders (#E2E8F0). In Dark Mode, use a deep Navy-Black (#020617) rather than pure black to maintain the glassmorphism depth.
- **Glass Tint:** Translucent surfaces should use a 60% opacity white (Light Mode) or a 40% opacity slate (Dark Mode) with a 20px background blur.

## Typography

The typography system uses a dual-font approach to balance personality with utility. 

**Outfit** is reserved for headlines. Its geometric construction and wide apertures provide a modern, welcoming, and high-end feel. **Inter** is used for all body copy and UI labels to ensure maximum legibility during long study sessions and data-heavy grade views.

Maintain tight tracking on larger headlines to enhance the "premium" aesthetic. For body text, ensure a generous line height (at least 1.5x) to prevent cognitive fatigue during reading.

## Layout & Spacing

The layout follows a **fluid grid system** tailored for mobile-first interaction. 

- **Margins:** A standard 20px horizontal margin ensures content doesn't feel cramped against device edges.
- **Vertical Rhythm:** Use an 8px base grid. Spacing between related items should be 8px or 16px, while spacing between distinct sections should be 32px or 48px.
- **Glass Overlays:** Bottom navigation bars and top headers must be "sticky" with a `backdrop-filter: blur(20px)` to allow content to scroll elegantly beneath them, maintaining a sense of spatial awareness.

## Elevation & Depth

Hierarchy is established through **translucency and ambient shadows** rather than heavy solid colors.

1.  **Level 0 (Base):** Solid background color (White or Deep Navy).
2.  **Level 1 (Cards):** Subtle white/slate surfaces with a 1px soft border and a very faint, large-radius shadow (0px 4px 20px rgba(0,0,0,0.05)).
3.  **Level 2 (Modals/Navigation):** Glassmorphic surfaces with `backdrop-blur: 24px`. These layers should have a "highlight" border on the top and left edges (0.5px white at 20% opacity) to simulate light catching the edge of a glass pane.
4.  **Level 3 (Popovers):** Highest elevation with more aggressive shadows and slightly higher opacity to ensure focus.

## Shapes

The shape language is **distinctly rounded** to soften the "academic" nature of the app and make it feel more approachable and modern. 

- **Primary Radius:** 16px (0.5rem base) for standard cards and buttons.
- **Large Radius:** 24px (1rem) for major containers, bottom sheets, and featured modules.
- **Pill-shaped:** Used exclusively for tags, chips, and the main search bar to differentiate them from actionable containers.

## Components

### Buttons
Primary buttons use a solid Electric Indigo fill with white text. Secondary buttons use a glass-style background (translucent Indigo at 10%) with Indigo text. All buttons have 16px corner radii and a subtle "press" animation where the scale reduces to 0.98.

### Cards
Cards are the primary container for course info and assignments. They feature a 1px border (#E2E8F0 in light mode) and the Level 1 shadow. Headers within cards should use the `label-md` style for categorizations.

### Input Fields
Inputs are minimal: a 1px border that transforms into a 2px Electric Indigo border on focus. Backgrounds should be slightly off-white to distinguish from the base surface.

### Chips & Tags
Used for subject tags (e.g., "Mathematics", "Due Soon"). These use a pill shape and a light tint of the primary or semantic color (e.g., Red for "Overdue").

### Modals & Sheets
Apply a heavy `backdrop-filter: blur(20px)` to the background overlay. The modal itself should be a glassmorphic container with 32px rounded top corners when used as a bottom sheet.

### Progress Bars
Use a thick, 8px rounded track. The "fill" should be a subtle gradient from Primary to Secondary to denote movement and energy.