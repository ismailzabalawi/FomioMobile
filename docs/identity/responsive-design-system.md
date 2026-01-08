# Fomio Responsive Design System

**Date:** January 2025  
**Status:** Production Ready  
**Last Updated:** January 2025

## Overview

Fomio's responsive design system provides a comprehensive, mobile-first approach to handling screen dimensions, foldable devices, and adaptive layouts. The system is built on React Native's built-in APIs with custom hooks that enhance foldable device support and provide semantic breakpoint management.

## Philosophy

Fomio's responsive design follows these core principles:

1. **Zero-layer simplicity** - No unnecessary abstraction layers
2. **Content-first layouts** - Breakpoints adapt layouts, not arbitrary scaling
3. **Semantic tokens** - Typography scales via design system, not functions
4. **Performance-first** - Minimal dependencies, native APIs
5. **Foldable-aware** - Native support for foldable devices with graceful fallbacks

## Core Tools

### Built-in React Native APIs

**`useWindowDimensions`** - Primary dimension source
- Real-time updates on rotation, fold/unfold, font scale changes
- Used throughout the codebase as the foundation for all responsive hooks
- No external dependencies required

**`Dimensions.get('window')`** - Static access
- Use for one-time calculations or non-reactive contexts
- Prefer `useWindowDimensions` in components for reactivity

**Percentage-based styles** - Via NativeWind/Tailwind
- `width: '100%'`, `flex: 1`, etc. scale proportionally
- Aligns with semantic token system
- Standard pattern throughout Fomio

### Custom Hooks

Fomio provides four specialized hooks for responsive design:

#### 1. `useFoldableLayout`

**Purpose:** Foldable/dual-screen device layout awareness

**Location:** `shared/hooks/useFoldableLayout.ts`

**Features:**
- Native foldable detection via `@logicwind/react-native-fold-detection`
- Width-based heuristic fallback (works in Expo Go)
- Aspect ratio detection and flags
- Safe area insets (unchanged from system)
- Device posture detection (tableTop, book, flat)

**Returns:**
```typescript
{
  isSpanning: boolean;           // Device is in spanning/wide mode
  hinge: HingeInfo;              // Detailed hinge information
  posture: {
    isTableTop: boolean;
    isBook: boolean;
    isFlat: boolean;
  };
  // Screen dimensions
  screenWidth: number;
  screenHeight: number;
  // Aspect ratio information
  aspectRatio: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isVeryTall: boolean;           // Aspect ratio < 0.5 (outer screen)
  isVeryWide: boolean;           // Aspect ratio > 2.0 (unfolded landscape)
  isSquareish: boolean;          // Aspect ratio 0.8-1.25 (inner screen)
  isNarrowScreen: boolean;       // Width < 400px (outer screen)
  // Safe area insets (unchanged from system)
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  horizontalPadding: number;
  // Responsive flags
  isWideScreen: boolean;         // Width > 600px
  isTablet: boolean;             // Width > 768px
}
```

**Usage Example:**
```tsx
import { useFoldableLayout } from '@/shared/hooks/useFoldableLayout';

function MyComponent() {
  const { isSpanning, isNarrowScreen, paddingLeft, paddingRight } = useFoldableLayout();
  
  return (
    <View style={{
      paddingLeft,
      paddingRight,
      maxWidth: isSpanning ? 1200 : '100%',
    }}>
      {/* Content adapts to foldable state */}
    </View>
  );
}
```

#### 2. `useResponsiveBreakpoints`

**Purpose:** Breakpoint-based responsive layouts

**Location:** `shared/hooks/useResponsiveBreakpoints.ts`

**Breakpoints:**
- `xs`: 0px+ (phones, small screens)
- `sm`: 640px+ (tablets, small foldables)
- `md`: 768px+ (tablets, foldables)
- `lg`: 1024px+ (foldables unfolded, tablets landscape)
- `xl`: 1280px+ (large tablets, desktop)

**Returns:**
```typescript
{
  width: number;
  current: Breakpoint;           // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  isTablet: boolean;             // Alias for isMd
  isWide: boolean;                // Alias for isLg
}
```

**Usage Example:**
```tsx
import { useResponsiveBreakpoints } from '@/shared/hooks/useResponsiveBreakpoints';

function FeedGrid() {
  const { current, isTablet, isWide } = useResponsiveBreakpoints();
  
  const columns = isWide ? 3 : isTablet ? 2 : 1;
  const padding = current === 'xl' ? 24 : current === 'lg' ? 20 : 16;
  
  return (
    <FlatList
      numColumns={columns}
      contentContainerStyle={{ padding }}
      // ...
    />
  );
}
```

#### 3. `useAdaptiveContentLayout`

**Purpose:** Adaptive content width and padding management

**Location:** `shared/hooks/useAdaptiveContentLayout.ts`

**Features:**
- Handles safe area insets automatically
- Optional content width constraints (disabled by default)
- Hinge-aware padding adjustments
- Safe for ScrollView/FlatList `contentContainerStyle`

**Options:**
```typescript
{
  maxWidth?: number;              // Default: 10000
  widthRatio?: number;            // Default: 1.0
  minHorizontalPadding?: number;   // Default: 8
  minWidthForConstraint?: number;  // Default: 100000 (effectively never)
  constrainForHinge?: boolean;    // Default: false
}
```

**Returns:**
```typescript
{
  contentContainerStyle: ViewStyle; // Safe for ScrollView contentContainerStyle
  contentWidth: number;            // Calculated content width
  sidePadding: number;              // Calculated side padding
}
```

**Usage Example:**
```tsx
import { useAdaptiveContentLayout } from '@/shared/hooks/useAdaptiveContentLayout';

function FeedScreen() {
  // Default: full width with safe area padding
  const layout = useAdaptiveContentLayout();
  
  // Constrained layout for tablets/wide screens
  const constrainedLayout = useAdaptiveContentLayout({
    maxWidth: 800,
    minWidthForConstraint: 768,
  });
  
  return (
    <ScrollView
      contentContainerStyle={layout.contentContainerStyle}
      // ...
    />
  );
}
```

**Important Notes:**
- By default, content is **not constrained** (`minWidthForConstraint = 100000`)
- This prevents narrow layouts that became unworkable
- Explicit configuration is required for constrained layouts
- `contentContainerStyle` only contains padding, not width constraints

#### 4. `useStableDimensions`

**Purpose:** Debounced window dimensions for performance

**Location:** `shared/hooks/useStableDimensions.ts`

**Features:**
- Debounces rapid dimension changes during fold/unfold animations
- Prevents excessive re-renders
- Configurable debounce delay (default: 100ms)

**Usage:**
```tsx
import { useStableDimensions } from '@/shared/hooks/useStableDimensions';

function ExpensiveLayout() {
  // Use when layout calculations are expensive
  const { width, height } = useStableDimensions(200); // 200ms debounce
  
  const layout = useMemo(() => {
    return calculateExpensiveLayout(width, height);
  }, [width, height]);
  
  // ...
}
```

**When to Use:**
- ✅ Expensive layout calculations
- ✅ Performance issues from rapid dimension changes
- ✅ Fold/unfold animations causing jank

**When NOT to Use:**
- ❌ Real-time UI feedback that needs immediate updates
- ❌ Components that handle rapid re-renders efficiently
- ❌ Cases where debouncing would cause noticeable lag

## Layout Patterns

### Standard Content Layout

**Pattern:** Full width with safe area padding

```tsx
import { useAdaptiveContentLayout } from '@/shared/hooks/useAdaptiveContentLayout';

function StandardScreen() {
  const layout = useAdaptiveContentLayout();
  
  return (
    <ScrollView
      contentContainerStyle={layout.contentContainerStyle}
    >
      {/* Content fills 100% width minus padding */}
    </ScrollView>
  );
}
```

### Constrained Content Layout

**Pattern:** Max width for readability on wide screens

```tsx
function ConstrainedScreen() {
  const layout = useAdaptiveContentLayout({
    maxWidth: 800,
    minWidthForConstraint: 768, // Only constrain on tablets+
  });
  
  return (
    <ScrollView
      style={{ maxWidth: layout.contentWidth }}
      contentContainerStyle={layout.contentContainerStyle}
    >
      {/* Content centered with max width */}
    </ScrollView>
  );
}
```

### Foldable-Aware Layout

**Pattern:** Adapt layout based on foldable state

```tsx
import { useFoldableLayout } from '@/shared/hooks/useFoldableLayout';
import { useResponsiveBreakpoints } from '@/shared/hooks/useResponsiveBreakpoints';

function AdaptiveScreen() {
  const { isSpanning, isNarrowScreen } = useFoldableLayout();
  const { isWide } = useResponsiveBreakpoints();
  
  const columns = isWide ? 3 : isSpanning ? 2 : 1;
  const padding = isNarrowScreen ? 12 : 16;
  
  return (
    <FlatList
      numColumns={columns}
      contentContainerStyle={{ padding }}
      // ...
    />
  );
}
```

## Styling Guidelines

### Width Patterns

**Standard:** Use `width: '100%'` for content
- ✅ Images, cards, containers
- ✅ Forms, inputs, buttons
- ✅ ScrollView content

**Constrained:** Use `maxWidth` for readability
- ✅ Action bars: `maxWidth: 600`
- ✅ Forms: `maxWidth: 320-400`
- ✅ Modals: `maxWidth: 400-500`

### Padding Patterns

**Safe Area Padding:**
- Use `useFoldableLayout()` for safe area insets
- Pass through unchanged (no multipliers)
- Apply via `paddingLeft`, `paddingRight`, etc.

**Content Padding:**
- Use `useAdaptiveContentLayout()` for automatic padding
- Or apply manually: `paddingHorizontal: 16`
- Consider `isNarrowScreen` for reduced padding on outer foldable screens

### Typography Scaling

**Semantic Tokens:**
- Use NativeWind classes: `text-title`, `text-body`, `text-caption`
- Defined in `tailwind.config.js`
- Scales automatically via design system

**Do NOT:**
- ❌ Use `react-native-size-matters` or similar scaling libraries
- ❌ Manually scale font sizes with functions
- ❌ Use arbitrary pixel values for typography

## Foldable Device Support

### Android Configuration

**Expo Config Plugin:** `plugins/withFoldableSupport.js`

Automatically configures:
- `configChanges` flags for screen size changes
- `resizeableActivity: true`
- `singleTask` launch mode for deep links

**Required `configChanges`:**
- `screenSize` - foldable expand/collapse
- `smallestScreenSize` - split-screen mode
- `screenLayout` - screen layout changes
- `orientation` - rotation
- `keyboard` / `keyboardHidden` - keyboard appearance
- `density` - display density changes

### Native Detection

**Library:** `@logicwind/react-native-fold-detection`

**Provider:** Wrapped in `app/_layout.tsx`

```tsx
<FoldingFeatureProvider>
  <ThemeProvider>
    {/* App content */}
  </ThemeProvider>
</FoldingFeatureProvider>
```

**Fallback:** Width-based heuristic (`width > 600` = spanning)

### Common Foldable Scenarios

**Outer Screen (Folded):**
- Width: ~320-400px
- Aspect ratio: ~0.4-0.5 (very tall)
- `isNarrowScreen: true`
- `isVeryTall: true`

**Inner Screen (Unfolded):**
- Width: ~672-840px
- Aspect ratio: ~0.8-1.0 (squareish)
- `isSpanning: true`
- `isSquareish: true`

**Unfolded Landscape:**
- Width: ~1200-1600px
- Aspect ratio: ~2.0+ (very wide)
- `isSpanning: true`
- `isVeryWide: true`

## Best Practices

### ✅ Do

1. **Use semantic tokens** for typography and spacing
2. **Use percentage-based widths** (`width: '100%'`)
3. **Use `useFoldableLayout`** for safe area insets
4. **Use `useResponsiveBreakpoints`** for layout decisions
5. **Test on foldable devices** or emulators
6. **Handle narrow screens** with `isNarrowScreen` flag
7. **Use `flex-wrap`** for content that might overflow on narrow screens

### ❌ Don't

1. **Don't use scaling libraries** like `react-native-size-matters`
2. **Don't modify safe area insets** with multipliers
3. **Don't use arbitrary pixel values** for responsive layouts
4. **Don't assume fixed screen sizes**
5. **Don't ignore aspect ratio** on foldable devices
6. **Don't constrain content by default** (causes narrow layouts)

## Troubleshooting

### Content Not Scrolling to End

**Problem:** ScrollView content cut off at bottom

**Solution:**
- Remove nested `SafeAreaView` wrappers
- Ensure `contentContainerStyle` doesn't have `flexGrow: 1` (unless needed)
- Check that `StickyActionBar` handles its own bottom padding
- Verify no double safe area application

### Layout Broken on Outer Screen

**Problem:** Content overflow or layout issues on folded device

**Solution:**
- Use `isNarrowScreen` flag to reduce padding/spacing
- Add `flex-wrap` to flex rows that might overflow
- Check for fixed widths that don't adapt
- Verify safe area insets are applied correctly

### Rapid Re-renders During Fold/Unfold

**Problem:** Performance issues during screen transitions

**Solution:**
- Use `useStableDimensions` for expensive calculations
- Memoize layout calculations with `useMemo`
- Debounce dimension changes (100-200ms)

### Content Too Narrow on Wide Screens

**Problem:** Content doesn't utilize available space

**Solution:**
- Remove unnecessary `maxWidth` constraints
- Use `useAdaptiveContentLayout` with explicit `minWidthForConstraint`
- Ensure `width: '100%'` is used, not fixed pixel values

## Migration Guide

### From Scaling Libraries

If migrating from `react-native-size-matters`:

1. **Remove library:**
   ```bash
   npm uninstall react-native-size-matters
   ```

2. **Replace `scale()` calls:**
   ```tsx
   // Before
   fontSize: scale(16)
   
   // After
   className="text-body" // Semantic token
   ```

3. **Replace `verticalScale()` calls:**
   ```tsx
   // Before
   paddingVertical: verticalScale(12)
   
   // After
   className="py-3" // NativeWind spacing
   ```

4. **Use breakpoints for layout:**
   ```tsx
   // Before
   width: scale(300)
   
   // After
   const { isTablet } = useResponsiveBreakpoints();
   width: isTablet ? 400 : '100%'
   ```

## Examples

### Feed Screen with Adaptive Layout

```tsx
import { useAdaptiveContentLayout } from '@/shared/hooks/useAdaptiveContentLayout';
import { useResponsiveBreakpoints } from '@/shared/hooks/useResponsiveBreakpoints';

export default function FeedScreen() {
  const layout = useAdaptiveContentLayout({ minHorizontalPadding: 0 });
  const { isTablet } = useResponsiveBreakpoints();
  
  const numColumns = isTablet ? 2 : 1;
  
  return (
    <FlatList
      numColumns={numColumns}
      contentContainerStyle={layout.contentContainerStyle}
      // ...
    />
  );
}
```

### Profile Card with Narrow Screen Support

```tsx
import { useFoldableLayout } from '@/shared/hooks/useFoldableLayout';

function ProfileCard() {
  const { isNarrowScreen, paddingLeft, paddingRight } = useFoldableLayout();
  
  return (
    <View style={{
      paddingLeft,
      paddingRight,
      paddingHorizontal: isNarrowScreen ? 12 : 16,
    }}>
      {/* Content adapts to narrow screens */}
    </View>
  );
}
```

### Action Bar with Max Width

```tsx
import { useResponsiveBreakpoints } from '@/shared/hooks/useResponsiveBreakpoints';

function ActionBar() {
  const { isWide } = useResponsiveBreakpoints();
  
  return (
    <View style={{
      width: '100%',
      maxWidth: isWide ? 600 : '100%',
      alignSelf: 'center',
    }}>
      {/* Centered on wide screens, full width on mobile */}
    </View>
  );
}
```

## Related Documentation

- [ByteBlogPage UI Improvements](./byteblogpage-ui-improvements.md) - Component-specific responsive patterns
- [Deep Links](./deep-links.md) - Deep link handling during fold/unfold
- [Caching Guide](./caching-guide.md) - Data caching considerations for responsive layouts

## References

- [React Native useWindowDimensions](https://reactnative.dev/docs/usewindowdimensions)
- [Expo Image contentFit](https://docs.expo.dev/versions/latest/sdk/image/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [Android Foldable Support](https://developer.android.com/guide/topics/large-screens/support-different-screen-sizes)

---

**Maintained by:** Fomio Development Team  
**Last Review:** January 2025

