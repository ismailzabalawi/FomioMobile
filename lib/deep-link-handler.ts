/**
 * Deep Link Handler for Fomio
 * 
 * Processes incoming fomio:// URLs and routes to correct screens.
 * 
 * Production-hardened:
 * - Normalizes host+path to handle expo-linking inconsistencies
 * - Safely parses query params (handles numbers, booleans, arrays)
 * - Uses replace() for cold start, push() for warm start
 * - Carves out auth callbacks before normal routing
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { FOMIO_SCHEME, DEEP_LINK_ROUTES, AUTH_PATHS, requiresAuth } from './deep-linking';
import { storePendingIntent } from './pending-intent';
import { logger } from '@/shared/logger';

/**
 * Result of resolving a deep link URL.
 */
export interface DeepLinkResult {
  /** The Expo Router path to navigate to */
  path: string;
  /** Whether this is an auth-related path (auth callback) */
  isAuth: boolean;
  /** Whether this route requires the user to be authenticated */
  requiresAuth: boolean;
  /** The original effective path (for intent replay) */
  effectivePath: string;
}

/**
 * Normalize host + path into a single effective path.
 * 
 * Handles inconsistent expo-linking parsing:
 * - fomio://byte/123 → host="byte", path="123"
 * - fomio:///byte/123 → host="", path="byte/123"
 * - fomio://byte → host="byte", path=""
 * 
 * @param parsed - The parsed URL from expo-linking
 * @returns A normalized path string without leading/trailing slashes
 */
function normalizeEffectivePath(parsed: Linking.ParsedURL): string {
  const parts: string[] = [];

  // expo-linking may put the first segment in hostname
  if (parsed.hostname) {
    parts.push(parsed.hostname);
  }

  // The rest goes in path
  if (parsed.path) {
    parts.push(parsed.path);
  }

  // Join and clean up slashes
  return parts
    .join('/')
    .replace(/^\/+/, '')  // Remove leading slashes
    .replace(/\/+$/, ''); // Remove trailing slashes
}

/**
 * Safely parse query params, coercing all values to strings.
 * 
 * Handles:
 * - numbers → "123"
 * - booleans → "true" / "false"
 * - arrays → first element as string
 * - undefined/null → skipped
 * 
 * @param queryParams - The query params object from expo-linking
 * @returns A URLSearchParams instance with string values
 */
function safeQueryParams(queryParams: Record<string, unknown> | undefined): URLSearchParams {
  const params = new URLSearchParams();

  if (!queryParams) return params;

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // Take first value for arrays
      const first = value[0];
      if (first !== undefined && first !== null) {
        params.set(key, String(first));
      }
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}

/**
 * Check if the effective path matches any auth callback patterns.
 * 
 * @param effectivePath - The normalized path
 * @returns true if this is an auth-related path
 */
function isAuthPath(effectivePath: string): boolean {
  return AUTH_PATHS.some(
    (authPath) =>
      effectivePath === authPath ||
      effectivePath.startsWith(authPath + '/')
  );
}

/**
 * Convert https://meta.fomio.app URLs to fomio:// URLs
 * Maps Discourse URL patterns to Fomio URL patterns
 * 
 * @param url - The HTTPS URL from meta.fomio.app
 * @returns The converted fomio:// URL, or null if not a recognized pattern
 */
function convertHttpsUrlToFomioUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    
    // Only handle https://meta.fomio.app URLs
    if (parsed.scheme !== 'https' || parsed.hostname !== 'meta.fomio.app') {
      return null;
    }

    // Normalize path: Expo Linking.parse() may return path without leading slash
    const rawPath = parsed.path ?? '';
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    
    // Debug logging for URL conversion
    logger.info('Converting HTTPS URL', {
      originalUrl: url,
      parsedScheme: parsed.scheme,
      parsedHostname: parsed.hostname,
      rawPath,
      normalizedPath: path,
      queryParams: parsed.queryParams,
    });
    
    // Extract topic ID from /t/{slug}/{id} - Discourse topic URL format
    // Handle trailing slashes and query params
    const topicMatch = path.match(/^\/t\/[^/]+\/(\d+)(?:\/|\?|$)/);
    if (topicMatch) {
      const topicId = topicMatch[1];
      logger.info('Matched topic URL with slug', { path, topicId, match: topicMatch[0] });
      return `fomio://byte/${topicId}`;
    }
    
    // Extract topic ID from /t/{id} (without slug, fallback format)
    // Handle trailing slashes and query params
    const topicShortMatch = path.match(/^\/t\/(\d+)(?:\/|\?|$)/);
    if (topicShortMatch) {
      logger.info('Matched topic URL without slug', { path, topicId: topicShortMatch[1], match: topicShortMatch[0] });
      return `fomio://byte/${topicShortMatch[1]}`;
    }
    
    // Account activation: /u/activate-account/{token}
    const activationMatch = path.match(/^\/u\/activate-account\/([^/]+)/);
    if (activationMatch) {
      const token = activationMatch[1];
      return `fomio://activate-account?token=${encodeURIComponent(token)}`;
    }

    // User profile: /u/{username}
    const userMatch = path.match(/^\/u\/([^/]+)/);
    if (userMatch) {
      return `fomio://profile/${userMatch[1]}`;
    }
    
    // Category: /c/{...}/{id} or /c/{slug}
    // Discourse category URLs can be: /c/parent/child/12 or /c/slug/12 or /c/slug
    // Prefer the numeric ID if present (most stable), otherwise use last slug
    const categoryWithIdMatch = path.match(/^\/c\/(?:[^/]+\/)*(\d+)(?:\/|\?|$)/);
    if (categoryWithIdMatch) {
      // ID-based mapping (most reliable)
      return `fomio://teret/id/${categoryWithIdMatch[1]}`;
    }
    const categorySlugMatch = path.match(/^\/c\/(?:[^/]+\/)*([^/\d][^/]*)(?:\/|\?|$)/);
    if (categorySlugMatch) {
      // Slug-based mapping (fallback for URLs without ID)
      return `fomio://teret/${categorySlugMatch[1]}`;
    }
    
    // Search: /search
    if (path === '/search' || path.startsWith('/search?')) {
      const query = parsed.queryParams?.q;
      if (query) {
        return `fomio://search?q=${encodeURIComponent(String(query))}`;
      }
      return 'fomio://search';
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to convert HTTPS URL to Fomio URL', error, { url });
    return null;
  }
}

/**
 * Resolve a deep link URL to an Expo Router path.
 * 
 * @param url - The full deep link URL (can be fomio:// or https://meta.fomio.app)
 * @returns DeepLinkResult with path and isAuth flag, or null if not a recognized URL
 */
export function resolveDeepLink(url: string): DeepLinkResult | null {
  let parsed: Linking.ParsedURL;

  try {
    parsed = Linking.parse(url);
  } catch (error) {
    logger.error('Failed to parse deep link URL', error, { url });
    return null;
  }

  // Convert https://meta.fomio.app URLs to fomio:// URLs
  if (parsed.scheme === 'https' && parsed.hostname === 'meta.fomio.app') {
    const convertedUrl = convertHttpsUrlToFomioUrl(url);
    if (convertedUrl) {
      logger.info('Converted HTTPS URL to Fomio URL', { 
        original: url, 
        converted: convertedUrl,
        parsedPath: parsed.path,
      });
      // Recursively process the converted URL
      return resolveDeepLink(convertedUrl);
    }
    // If conversion failed, it's not a recognized URL pattern
    logger.warn('HTTPS URL could not be converted to Fomio URL', { 
      url,
      parsedScheme: parsed.scheme,
      parsedHostname: parsed.hostname,
      parsedPath: parsed.path,
      queryParams: parsed.queryParams,
    });
    return null;
  }

  // Only handle fomio:// scheme (after HTTPS conversion)
  if (parsed.scheme !== FOMIO_SCHEME) {
    return null;
  }

  const effectivePath = normalizeEffectivePath(parsed);
  const params = safeQueryParams(parsed.queryParams as Record<string, unknown>);

  // Auth carve-out: route to existing auth handler
  if (isAuthPath(effectivePath)) {
    logger.info('Deep link is auth callback, routing to auth handler', { effectivePath });

    // Preserve the payload param for auth handling
    const payload = params.get('payload');
    if (payload) {
      return {
        path: `/auth/callback?payload=${encodeURIComponent(payload)}`,
        isAuth: true,
        requiresAuth: false,
        effectivePath,
      };
    }

    // Fallback to the raw auth path
    return { 
      path: `/${effectivePath}`, 
      isAuth: true,
      requiresAuth: false,
      effectivePath,
    };
  }

  // Check if this path requires authentication
  const authRequired = requiresAuth(effectivePath);

  // Match against route patterns
  for (const route of DEEP_LINK_ROUTES) {
    const match = effectivePath.match(route.pattern);
    if (match) {
      const resolvedPath = route.toPath(match, params);
      logger.info('Deep link resolved', {
        url,
        effectivePath,
        resolvedPath,
        discourseType: route.discourseType,
        requiresAuth: authRequired,
      });
      return { 
        path: resolvedPath, 
        isAuth: false,
        requiresAuth: authRequired,
        effectivePath,
      };
    }
  }

  // Fallback to home, but log unrecognized path
  logger.warn('Unrecognized deep link path, falling back to home', {
    url,
    effectivePath,
  });
  return { 
    path: '/(tabs)', 
    isAuth: false,
    requiresAuth: false,
    effectivePath,
  };
}

/**
 * Handle a deep link URL by navigating to the resolved path.
 * 
 * If the route requires authentication and the user is not authenticated,
 * the intent is stored for replay after successful auth.
 * 
 * @param url - The deep link URL to handle
 * @param isColdStart - Whether this is a cold start (app was killed).
 *                      Cold start uses replace() to prevent weird back stack.
 *                      Warm start uses push() for normal navigation.
 * @param isAuthenticated - Whether the user is currently authenticated.
 *                          Defaults to true for backwards compatibility.
 * @returns true if handled successfully, false otherwise
 */
export function handleDeepLink(
  url: string, 
  isColdStart: boolean = false,
  isAuthenticated: boolean = true
): boolean {
  logger.info('Processing deep link', { url, isColdStart, isAuthenticated });

  try {
    const result = resolveDeepLink(url);

    if (!result) {
      logger.info('URL not a fomio:// scheme, ignoring', { url });
      return false;
    }

    // Auth carve-out: never store auth paths as pending intent, just navigate
    if (result.isAuth) {
      if (isColdStart) {
        router.replace(result.path as any);
      } else {
        router.push(result.path as any);
      }
      return true;
    }

    // Gate: if route requires auth and user is not authenticated
    if (result.requiresAuth && !isAuthenticated) {
      logger.info('Deep link requires auth, storing intent and redirecting to login', {
        url,
        resolvedPath: result.path,
      });

      // Store intent for replay after auth (fire and forget, don't await)
      storePendingIntent({
        url,
        resolvedPath: result.path,
        createdAt: Date.now(),
      });

      // Redirect to auth entry
      router.replace('/(auth)/signin' as any);
      return true;
    }

    // Normal navigation
    if (isColdStart) {
      router.replace(result.path as any);
    } else {
      // For warm start, use replace() for certain routes to prevent navigation stack issues:
      // - Feed routes: nested stacks, push() can cause "screen doesn't exist" on back navigation
      // - Auth routes: signup-complete should replace the signup screen to clear stale state
      //   (user was on "Almost There!" screen when Ricochet triggers after email verification)
      // Using replace() maintains a clean navigation state
      if (result.path.startsWith('/feed') || result.path.startsWith('/(auth)')) {
        router.replace(result.path as any);
      } else {
        // For other routes, use push() to maintain navigation stack
        router.push(result.path as any);
      }
    }

    return true;
  } catch (error) {
    logger.error('Failed to handle deep link', error, { url });
    return false;
  }
}

/**
 * Check if a URL is a valid Fomio deep link.
 * 
 * @param url - The URL to check
 * @returns true if the URL uses the fomio:// scheme or https://meta.fomio.app
 */
export function isFomioDeepLink(url: string): boolean {
  try {
    const parsed = Linking.parse(url);
    // Accept both fomio:// and https://meta.fomio.app URLs
    return parsed.scheme === FOMIO_SCHEME || 
           (parsed.scheme === 'https' && parsed.hostname === 'meta.fomio.app');
  } catch {
    return false;
  }
}

/**
 * Check if a deep link URL requires authentication.
 * Useful for determining if auth should be shown before navigating.
 * 
 * @param url - The deep link URL to check
 * @returns true if the route requires authentication
 */
export function deepLinkRequiresAuth(url: string): boolean {
  const result = resolveDeepLink(url);
  return result?.requiresAuth ?? false;
}

// Re-export requiresAuth for direct path checking
export { requiresAuth } from './deep-linking';
