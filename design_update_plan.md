# Design Update Plan: "Modern Professional" Trading UI

This plan outlines design updates to the stock insights application, drawing inspiration from Webull's trading pages. The goal is to create a premium, high-tech, yet approachable interface characterized by clean layouts, distinct typography, and vibrant accents.

## Proposed Changes

### 1. Global Color Palette & Theming (globals.css)
- **Primary Accent:** Vibrant Royal Blue (`#007AFF` or similar) for core Call-to-Action (CTA) buttons and active states.
- **Backgrounds:** 
  - *Light Mode:* Pure white (`#ffffff`) for main content, with very light gray/blue tinted sections (`#F5F5F7` or `#F0F4F8`) to create soft separation without harsh lines.
  - *Dark Mode:* Deep charcoal to near-black backgrounds with subtle slate borders to maintain a "high-tech" feel.
- **Gradients:** Introduce subtle linear and radial gradients (e.g., indigo-to-navy) for hero sections or significant background areas to avoid a completely "flat" look.

### 2. Typography Strategy
- **Font:** Ensure a highly legible, modern sans-serif font (like `Inter` or `Outfit`) is used consistently.
- **Hierarchy:** 
  - Larger, bolder (e.g., `font-bold` or `font-extrabold`) headings for distinct feature sections.
  - Medium-weight body text with generous line-height for readability.
  - All-caps or title-case bold text for prominent buttons.

### 3. Layout & Structure
- **Whitespace:** Increase padding and margins between sections. Use a more spacious, breathable layout.
- **Grid Patterns:** Utilize an alternating two-column layout (text on left/visual on right, then swapped) for feature presentations or dashboard modules.
- **Navigation:** Implement sticky or semi-transparent headers for primary navigation and sub-navigation (tabs) to maintain context.

### 4. Visual Elements & UI Components (UI Library / Tailwind)
- **Border Radius:** Increase border radius on buttons (pill-shaped or `rounded-full`) and container cards (`rounded-2xl` or `rounded-3xl` for a software-like feel).
- **Shadows:** Replace harsh borders with soft, large-spread drop shadows on cards and widgets to create a sense of depth and layering.
- **Glassmorphism:** Apply blurred, semi-transparent backgrounds (`backdrop-blur-md`, `bg-white/80`) to floating elements like stock price popups, modal overlays, or sticky headers.

### 5. Interactive Behaviors & Animations
- **Micro-animations:** Add smooth transition effects to buttons on hover (e.g., slight scaling `scale-105` or darkening) to provide instant user feedback.

## Verification Plan

### Manual Verification
1. Run the local development server (`npm run dev`).
2. Verify the new color palette, shadows, and rounded corners in both light and dark modes.
3. Check the typography hierarchy across different dashboard/feature sections.
4. Interact with buttons and cards to confirm smooth micro-animations and hover states.
