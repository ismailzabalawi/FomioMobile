# Fomio App — Brand Guidelines

## Palette
- Primary (Teal): `#009688` – core action color (`bg-fomio-primary`, buttons, highlights)
- Primary Dark: `#26A69A` – teal lifted for dark mode surfaces (`bg-fomio-primary-dark`)
- Primary Soft: `#B2DFDB` – subtle backgrounds and badges
- Primary Soft Dark: `#0B2F2C` – subtle dark-mode fills
- Secondary (Blue): `#1565C0` – supporting accent (links, info states)
- Secondary Light: `#42A5F5` – blue highlight for dark mode/info emphasis
- Neutrals: `#000000`, `#FFFFFF` – base surfaces and text

## Typography
- Typeface: **Plus Jakarta Sans**
  - Regular: body copy, long-form text
  - Bold: headlines, CTA labels
  - Italic: emphasis within body copy
- Implementation note: add the font files (Regular, Bold, Italic) under `assets/fonts/` and load them in `app/_layout.tsx` via `useFonts` (e.g. `PlusJakartaSans-Regular`, `PlusJakartaSans-Bold`, `PlusJakartaSans-Italic`). Map them into your text components once loaded.

## Token Mapping (already wired)
- NativeWind/Tailwind: `bg-fomio-primary`, `text-fomio-primary`, `bg-fomio-primary-dark`, `bg-fomio-accent` from `tailwind.config.js`.
- Design system: `colors.primary` and `colors.accent` in `shared/design-system.ts` now use the teal/blue palette; light/dark themes reference these tokens.
- UI helpers: shared components (buttons, chips, activity indicators, markdown, etc.) now point to the teal brand hue for emphasis; info states use the blue secondary.

## Usage Tips
- Primary teal for actions (buttons, toggles, active tabs, loaders).
- Secondary blue for informational states, links, and supportive highlights.
- Keep dark mode AMOLED surfaces pure black; use the `*dark` tokens for accents on black.
- Reserve danger/warning/status colors for semantics only; avoid mixing them with brand accents.
