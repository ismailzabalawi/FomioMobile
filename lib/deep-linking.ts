/**
 * Fomio URL Scheme Configuration
 * 
 * Maps Fomio-native URLs to Expo Router paths.
 * Translates Fomio concepts to Discourse concepts internally.
 * 
 * PUBLIC URLs use Fomio terminology (byte, teret, hub, profile)
 * INTERNAL mapping uses Discourse concepts (topic, category, user)
 */

export const FOMIO_SCHEME = 'fomio';

/**
 * Auth paths that bypass normal routing and go to existing auth handler.
 * These are checked BEFORE pattern matching.
 */
export const AUTH_PATHS = ['auth/callback', 'auth_redirect'];

/**
 * Patterns that require authentication.
 * If user is not authenticated, they should be prompted to sign in
 * and the intended destination should be replayed after auth.
 */
export const AUTH_REQUIRED_PATTERNS: RegExp[] = [
  /^me$/,                      // Current user profile
  /^notifications$/,           // Notifications
  /^compose/,                  // Create byte (with or without params)
  /^settings/,                 // Settings (all sub-routes)
];

/**
 * Check if an effective path requires authentication.
 * @param effectivePath - The normalized path (without scheme)
 * @returns true if the route requires authentication
 */
export function requiresAuth(effectivePath: string): boolean {
  return AUTH_REQUIRED_PATTERNS.some((pattern) => pattern.test(effectivePath));
}

export interface DeepLinkRoute {
  /** Regex pattern to match against the effective path */
  pattern: RegExp;
  /** Function to convert match + params to Expo Router path */
  toPath: (match: RegExpMatchArray, params: URLSearchParams) => string;
  /** Internal Discourse concept this maps to (for documentation/debugging) */
  discourseType?: 'topic' | 'category' | 'user' | 'parent_category';
}

/**
 * Deep link route definitions.
 * Order matters - first match wins.
 * 
 * URL Scheme:
 * - fomio://byte/{id} → Topic detail
 * - fomio://byte/{id}/comments → Topic with comments visible
 * - fomio://teret/{slug} → Category feed
 * - fomio://teret/id/{id} → Category by numeric ID (internal/fallback)
 * - fomio://hub/{slug} → Parent category view
 * - fomio://hub/id/{id} → Parent category by numeric ID (internal/fallback)
 * - fomio://profile/{username} → User profile
 * - fomio://me → Current user's profile
 * - fomio://search → Search screen
 * - fomio://search?q={query} → Search with pre-filled query
 * - fomio://notifications → Notifications
 * - fomio://compose → Create new byte
 * - fomio://compose?teret={slug} → Create byte in specific teret
 * - fomio://settings → Settings
 * - fomio://settings/profile → Edit profile
 * - fomio://settings/notifications → Notification settings
 * - fomio://signup-complete → Post-activation success (Ricochet from Discourse)
 * - fomio://home → Home feed
 * - fomio:// → Home feed (default)
 */
export const DEEP_LINK_ROUTES: DeepLinkRoute[] = [
  // ============================================================================
  // BYTES (Discourse: Topics)
  // ============================================================================
  {
    pattern: /^byte\/(\d+)\/comments$/,
    toPath: (m) => `/feed/${m[1]}?showComments=true`,
    discourseType: 'topic',
  },
  {
    pattern: /^byte\/(\d+)$/,
    toPath: (m) => `/feed/${m[1]}`,
    discourseType: 'topic',
  },

  // Legacy topic aliases (internal, for migration tolerance)
  // These are hidden from public documentation but support old links
  {
    pattern: /^topic\/(\d+)$/,
    toPath: (m) => `/feed/${m[1]}`,
    discourseType: 'topic',
  },
  {
    pattern: /^t\/(\d+)$/,
    toPath: (m) => `/feed/${m[1]}`,
    discourseType: 'topic',
  },

  // ============================================================================
  // TERETS (Discourse: Categories)
  // Support both slug and numeric ID
  // ============================================================================
  {
    pattern: /^teret\/id\/(\d+)$/,
    toPath: (m) => `/teret/${m[1]}?byId=true`,
    discourseType: 'category',
  },
  {
    pattern: /^teret\/([^/]+)$/,
    toPath: (m) => `/teret/${m[1]}`,
    discourseType: 'category',
  },

  // ============================================================================
  // HUBS (Discourse: Parent Categories)
  // Support both slug and numeric ID
  // ============================================================================
  {
    pattern: /^hub\/id\/(\d+)$/,
    toPath: (m) => `/hub/${m[1]}?byId=true`,
    discourseType: 'parent_category',
  },
  {
    pattern: /^hub\/([^/]+)$/,
    toPath: (m) => `/hub/${m[1]}`,
    discourseType: 'parent_category',
  },

  // ============================================================================
  // PROFILES (Discourse: Users)
  // ============================================================================
  {
    pattern: /^profile\/([^/]+)$/,
    toPath: (m) => `/profile/${m[1]}`,
    discourseType: 'user',
  },
  // Account activation (unauthenticated flow)
  {
    pattern: /^activate-account$/,
    toPath: (_, p) => {
      const token = p.get('token');
      return token
        ? `/(auth)/activate-account?token=${encodeURIComponent(token)}`
        : `/(auth)/activate-account`;
    },
    discourseType: 'user',
  },
  // Signup complete - Ricochet landing after Discourse activation
  // This catches fomio://signup-complete from in-app browsers (Gmail, Outlook, etc.)
  {
    pattern: /^signup-complete$/,
    toPath: () => '/(auth)/signup-complete',
  },
  // Legacy user alias
  {
    pattern: /^u\/([^/]+)$/,
    toPath: (m) => `/profile/${m[1]}`,
    discourseType: 'user',
  },
  {
    pattern: /^me$/,
    toPath: () => '/(tabs)/profile',
  },

  // ============================================================================
  // SEARCH
  // ============================================================================
  {
    pattern: /^search$/,
    toPath: (_, p) => {
      const q = p.get('q');
      return q ? `/(tabs)/search?q=${encodeURIComponent(q)}` : '/(tabs)/search';
    },
  },

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  {
    pattern: /^notifications$/,
    toPath: () => '/(tabs)/notifications',
  },

  // ============================================================================
  // COMPOSE
  // ============================================================================
  {
    pattern: /^compose$/,
    toPath: (_, p) => {
      const teret = p.get('teret');
      return teret ? `/compose?teret=${encodeURIComponent(teret)}` : '/compose';
    },
  },

  // ============================================================================
  // SETTINGS
  // ============================================================================
  {
    pattern: /^settings\/profile$/,
    toPath: () => '/(profile)/edit-profile',
  },
  {
    pattern: /^settings\/notifications$/,
    toPath: () => '/(profile)/notification-settings',
  },
  {
    pattern: /^settings$/,
    toPath: () => '/(profile)/settings',
  },

  // ============================================================================
  // HOME (default) - multiple valid paths
  // ============================================================================
  {
    pattern: /^home$/,
    toPath: () => '/(tabs)',
  },
  {
    pattern: /^$/,
    toPath: () => '/(tabs)',
  },
];
