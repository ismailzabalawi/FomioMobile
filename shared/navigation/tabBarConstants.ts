/**
 * Tab Bar Constants
 * 
 * Centralized constants for the navigation tab bar layout, animations, and styling.
 * These values define the geometry and behavior of the fluid navigation system.
 */

// ============================================================================
// PHYSICAL LAYOUT CONSTANTS
// These define the geometry of our fluid navigation system
// ============================================================================

/** Width of the active tab indicator bar */
export const INDICATOR_WIDTH = 34;

/** Radius of floating button "drops" (compose and scroll-to-top buttons) */
export const DROP_RADIUS = 28;

/** Radius of main tab bar end caps */
export const BAR_CAP_RADIUS = 22;

/** Full diameter of floating buttons */
export const DROP_SIZE = 56;

/** Physical gap between elements at rest */
export const INITIAL_GAP = 8;

/** Maximum stretch distance before left bridge (compose to bar) pinches off */
export const STRETCH_LEFT = 80;

/** Maximum stretch distance before right bridge (bar to scroll-to-top) pinches off */
export const STRETCH_RIGHT = 80;

/** Total height of the tab bar container */
export const CONTAINER_HEIGHT = 86;

// ============================================================================
// SCROLL THRESHOLDS (Fluid Dynamics Phases)
// These define when different animation phases occur during scrolling
// ============================================================================

/** Phase 1: Compose detaches from bar (reverse merge) */
export const DETACH_START = 0;
export const DETACH_END = 100;

/** Phase 2: Scroll-to-top/edit buds from bar */
export const BUD_START_BASE = 120;
export const BUD_END_BASE = 220;

/** Compose reappear window when scrolling back up (allows showing compose mid-list) */
export const REAPPEAR_WINDOW = 160;
export const REAPPEAR_RESET_DELTA = 8;
export const REAPPEAR_FACTOR = 0.9;

/** Bridge visibility thresholds for merge phase */
export const MERGE_BRIDGE_MIN = 0.05;
export const MERGE_BRIDGE_MAX = 0.9;

/** Bridge visibility thresholds for bud phase */
export const BUD_BRIDGE_MIN = 0.02;
export const BUD_BRIDGE_MAX = 0.9;

// ============================================================================
// ICON SIZES
// ============================================================================

/** Standard icon size for tab bar icons */
export const ICON_SIZE = 28;

/** Icon size for compose button */
export const COMPOSE_ICON_SIZE = 28;

/** Icon size used in FluidTabItem component */
export const TAB_ITEM_ICON_SIZE = 26;

// ============================================================================
// BADGE DIMENSIONS
// ============================================================================

/** Badge positioning */
export const BADGE_TOP = 4;
export const BADGE_RIGHT = 12;

/** Badge size */
export const BADGE_MIN_WIDTH = 18;
export const BADGE_HEIGHT = 18;
export const BADGE_BORDER_RADIUS = 9;
export const BADGE_PADDING_HORIZONTAL = 4;

/** Badge typography */
export const BADGE_FONT_SIZE = 10;
export const BADGE_FONT_WEIGHT = '700' as const;
export const BADGE_LINE_HEIGHT = 14;

// ============================================================================
// HIT TARGETS & SPACING
// ============================================================================

/** Hit slop for tab pressable areas */
export const TAB_HIT_SLOP = 12;

/** Horizontal padding for tab bar container */
export const TAB_BAR_HORIZONTAL_PADDING_BASE = 8;


