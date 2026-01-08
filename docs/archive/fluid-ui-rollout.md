# Fluid UI Rollout Plan (Fomio)

Source of truth for the “liquid glass” design language and phased rollout. Use this to coordinate changes, catch bugs early, and keep the experience cohesive.

---

## Purpose & Scope
- **Why:** Unify Fomio’s brand language around frosted surfaces, fluid motion, and consistent haptics; reduce regressions from piecemeal styling.
- **Scope:** Navigation (tabs/slots), chips/filters, sections/cards, pull-to-refresh, modals/sheets, micro-interactions.

## Tokens (Single Source of Truth)
- **File:** `shared/design/tokens.ts`
- **Use:** `getTokens(mode)` for colors, radii, blur, shadows, motion.
- **Key tokens:** `colors.surfaceFrost/surfaceMuted/accent/text/muted/border/shadow`, `radii` (`sm/md/lg/pill`), `blur.frost`, `motion.liquidSpring/snapSpring`, `shadows.soft`.
- **Rule:** No ad-hoc colors/radii/shadows/springs; import tokens.

## Primitives & Utilities
- **FluidSlotBar (`shared/ui/FluidSlotBar.tsx`):** Shared frosted container with animated slots; use for nav, filter bars, grouped chips. Props: `mode`, `slots` (key, flex/width, visible, render), `height`, `radius`.
- **FluidChip (`shared/ui/FluidChip.tsx`):** Frosted chip with accent state, haptics, consistent radii/shadow. Props: `label`, `selected`, `onPress`, `mode`.
- **FluidSection (`shared/ui/FluidSection.tsx`):** Frosted container for panels/cards with border/shadow from tokens.
- **Metaball (`shared/design/metaball.ts`):** Worklet-safe metaball path generator for fluid bridges (use sparingly; prefer unified surfaces).

---

## Phased Rollout

### Phase 1: Nav Alignment
- Refactor tab bar to use a slot-based layout (FluidSlotBar pattern): three slots (compose/main/up), shared frosted surface, animated widths/visibility from scroll state.
- Keep indicator alignment and haptics; reclaim space on small screens when slots hide.
- **Checks:** Tap targets, indicator position during resize, scroll-to-top behavior, small-screen spacing, light/dark contrast.

### Phase 2: Chips & Filters
- Replace ad-hoc chips (search filters, feed filters) with `FluidChip`.
- Ensure selection state, haptics, and colors come from tokens.
- **Checks:** State sync, tap area, contrast in both themes, haptics firing once.

### Phase 3: Sections & Cards
- Wrap panels/settings/empty states in `FluidSection` for consistent frosted surfaces and shadows.
- Harmonize padding and border usage with tokens.
- **Checks:** Nested padding, shadow stacking/overdraw, performance in scroll views.

### Phase 4: Fluid Interactions
- Introduce fluid pull-to-refresh (droplet/ring) using `metaball` + accent or frosted fill; respect reduced-motion.
- Optional: subtle bridges in nav if desired—keep fill frosted, not accent.
- **Checks:** Performance on low-end devices, no jank while scrolling, reduced-motion honors user settings.

### Phase 5: QA & Polish
- Test on small/large screens and light/dark modes.
- Verify haptics and motion consistency across nav, chips, pull-to-refresh, buttons.
- Adjust token values (blur/shadows/radii) if needed after device testing.

---

## Testing & Checklists (per phase)
- **Accessibility:** Labels present, sufficient contrast on frosted backgrounds, 44x44 hit targets.
- **Motion/Haptics:** Use token springs; avoid double animations; haptics light/medium only where meaningful.
- **Performance:** Watch FPS when blur/metaball active; consider lowering blur on older devices; avoid stacking shadows.
- **Visual Consistency:** No off-palette colors; consistent stroke/weight for icons; single shadow layer per element.

---

## Guidelines & Risks
- Unified surfaces: keep drops/slots inside one frosted container where possible; avoid layered pills that feel separate.
- Avoid custom colors/radii: always pull from tokens.
- Hit areas stable: don’t let animations move the pressable target unpredictably.
- Reduced motion: provide a low-motion path for intensive animations (pull-to-refresh, bridges).

---

## Source of Reality: Fluid Physics & Control Mapping
- **Physics backdrop:** Liquid coalescence/bridge formation and pinch-off are governed by incompressible Navier–Stokes with surface tension: continuity $$\nabla \cdot \mathbf{u} = 0$$, momentum $$\rho(\partial_t \mathbf{u} + \mathbf{u} \cdot \nabla \mathbf{u}) = -\nabla p + \nabla \cdot (2\mu \mathbf{D}) + \rho \mathbf{g} + \mathbf{f}_\sigma$$ where $$\mathbf{f}_\sigma = \gamma \kappa \mathbf{n} \delta_s$$ (Young–Laplace pressure jump $$\Delta p = \gamma \kappa$$).
- **Coalescence scaling:** Bridge growth starts capillary-driven; viscous regime $$d \sim (\gamma t^2/\mu)^{1/4}$$; inertia-dominated $$d \sim (\gamma/\rho)^{1/4} t^{1/2}$$. We mimic this with spring-driven expansion of bridges/slots.
- **Detachment/pinch-off:** Neck thinning follows Rayleigh–Plateau instability; minimum radius shrinks self-similarly until snap. Dimensionless numbers (Oh, We) describe regimes; in UI we approximate by clamping stretch and snapping opacity/width when a threshold is crossed.
- **Control mapping in UI:**
  - **Surface tension → Spring curves:** Use `liquidSpring` (damping 16, stiffness 220) for “gooey” expansion/contraction of slots/bridges; `snapSpring` for quick snaps.
  - **Viscosity → Damping:** Higher damping for heavier/viscous feels (e.g., pull-to-refresh), lower for lighter UI blips.
  - **Bridge growth → Interpolation:** Animate widths/bridges from 0→target with easing that starts slow, accelerates, then eases (matches $$t^{1/2}$$ feel).
  - **Pinch-off → Threshold:** When stretch/scroll exceeds a limit, collapse bridge/slot opacity to 0 and snap the segment to its detached state.
  - **Conservation feel:** Keep total bar width constant; redistribute slot widths rather than moving hit targets erratically.
- **Implementation cues:**
  - Use `metaball` for visual bridges only when needed; keep fills frosted to imply one surface.
  - Slot animations should be width/opacity changes inside one container (FluidSlotBar), not layered pills.
  - Default springs: `liquidSpring` for slot/bridge motion, `snapSpring` for small scale/selection pops.
  - Haptics: map “merge/snap” to light/medium impact; selection to `selectionAsync`.

---

## Usage Snippets

**Slot bar:**
```tsx
<FluidSlotBar
  mode={isDark ? 'dark' : 'light'}
  height={60}
  slots={[
    { key: 'compose', width: 56, visible: showCompose, render: renderCompose },
    { key: 'main', flex: 1, render: renderTabs },
    { key: 'up', width: 56, visible: showUp, render: renderUp },
  ]}
/>
```

**Chip:**
```tsx
<FluidChip
  label="Latest"
  selected={selected === 'latest'}
  onPress={() => setSelected('latest')}
  mode={isDark ? 'dark' : 'light'}
/>
```

---

## Next Steps
- Adopt tokens in nav and filters first (Phases 1–2).
- Move panels/sections to `FluidSection`.
- Plan pull-to-refresh fluid interaction after baseline is stable.
