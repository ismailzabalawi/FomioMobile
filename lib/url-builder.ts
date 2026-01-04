/**
 * URL Builder Utilities for Fomio
 * 
 * Generates shareable Fomio deep links using Fomio-native terminology.
 * All public URLs use Fomio concepts (byte, teret, hub, profile).
 * 
 * Usage:
 *   import { buildByteUrl } from '@/lib/url-builder';
 *   const shareUrl = buildByteUrl(123);
 *   // => "fomio://byte/123"
 */

import { FOMIO_SCHEME } from './deep-linking';

/**
 * Build a deep link URL for a Byte (topic).
 * 
 * @param byteId - The numeric ID of the byte/topic
 * @param showComments - Whether to show comments section by default
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildByteUrl(123) // => "fomio://byte/123"
 * buildByteUrl(123, true) // => "fomio://byte/123/comments"
 */
export function buildByteUrl(byteId: number, showComments: boolean = false): string {
  const base = `${FOMIO_SCHEME}://byte/${byteId}`;
  return showComments ? `${base}/comments` : base;
}

/**
 * Build a deep link URL for a user profile.
 * 
 * @param username - The username of the profile to view
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildProfileUrl("ismail") // => "fomio://profile/ismail"
 */
export function buildProfileUrl(username: string): string {
  return `${FOMIO_SCHEME}://profile/${encodeURIComponent(username)}`;
}

/**
 * Build a deep link URL for the current user's profile.
 * 
 * @returns The fomio:// deep link URL for "me"
 * 
 * @example
 * buildMyProfileUrl() // => "fomio://me"
 */
export function buildMyProfileUrl(): string {
  return `${FOMIO_SCHEME}://me`;
}

/**
 * Build a deep link URL for a Teret (category).
 * 
 * @param slug - The slug of the teret/category
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildTeretUrl("design") // => "fomio://teret/design"
 */
export function buildTeretUrl(slug: string): string {
  return `${FOMIO_SCHEME}://teret/${encodeURIComponent(slug)}`;
}

/**
 * Build a deep link URL for a Teret by numeric ID.
 * This is for internal/fallback use when slug is unavailable.
 * 
 * @param id - The numeric ID of the teret/category
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildTeretByIdUrl(5) // => "fomio://teret/id/5"
 */
export function buildTeretByIdUrl(id: number): string {
  return `${FOMIO_SCHEME}://teret/id/${id}`;
}

/**
 * Build a deep link URL for a Hub (parent category).
 * 
 * @param slug - The slug of the hub/parent category
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildHubUrl("technology") // => "fomio://hub/technology"
 */
export function buildHubUrl(slug: string): string {
  return `${FOMIO_SCHEME}://hub/${encodeURIComponent(slug)}`;
}

/**
 * Build a deep link URL for a Hub by numeric ID.
 * This is for internal/fallback use when slug is unavailable.
 * 
 * @param id - The numeric ID of the hub/parent category
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildHubByIdUrl(3) // => "fomio://hub/id/3"
 */
export function buildHubByIdUrl(id: number): string {
  return `${FOMIO_SCHEME}://hub/id/${id}`;
}

/**
 * Build a deep link URL for the search screen.
 * 
 * @param query - Optional pre-filled search query
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildSearchUrl() // => "fomio://search"
 * buildSearchUrl("react native") // => "fomio://search?q=react%20native"
 */
export function buildSearchUrl(query?: string): string {
  if (query) {
    return `${FOMIO_SCHEME}://search?q=${encodeURIComponent(query)}`;
  }
  return `${FOMIO_SCHEME}://search`;
}

/**
 * Build a deep link URL for the compose screen.
 * 
 * @param teretSlug - Optional teret slug to pre-select
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildComposeUrl() // => "fomio://compose"
 * buildComposeUrl("design") // => "fomio://compose?teret=design"
 */
export function buildComposeUrl(teretSlug?: string): string {
  if (teretSlug) {
    return `${FOMIO_SCHEME}://compose?teret=${encodeURIComponent(teretSlug)}`;
  }
  return `${FOMIO_SCHEME}://compose`;
}

/**
 * Build a deep link URL for the notifications screen.
 * 
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildNotificationsUrl() // => "fomio://notifications"
 */
export function buildNotificationsUrl(): string {
  return `${FOMIO_SCHEME}://notifications`;
}

/**
 * Build a deep link URL for settings.
 * 
 * @param section - Optional settings section ("profile" or "notifications")
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildSettingsUrl() // => "fomio://settings"
 * buildSettingsUrl("profile") // => "fomio://settings/profile"
 * buildSettingsUrl("notifications") // => "fomio://settings/notifications"
 */
export function buildSettingsUrl(section?: 'profile' | 'notifications'): string {
  if (section) {
    return `${FOMIO_SCHEME}://settings/${section}`;
  }
  return `${FOMIO_SCHEME}://settings`;
}

/**
 * Build a deep link URL for the home screen.
 * 
 * @returns The fomio:// deep link URL
 * 
 * @example
 * buildHomeUrl() // => "fomio://home"
 */
export function buildHomeUrl(): string {
  return `${FOMIO_SCHEME}://home`;
}

/**
 * Convert a Fomio deep link to a web URL for sharing externally.
 * This is useful when sharing to platforms that may not recognize fomio:// scheme.
 * 
 * @param fomioUrl - A fomio:// deep link
 * @param webDomain - The web domain to use (defaults to meta.fomio.app)
 * @returns A https:// web URL, or null if conversion not possible
 * 
 * @example
 * toWebUrl("fomio://byte/123") // => "https://meta.fomio.app/t/-/123"
 * toWebUrl("fomio://profile/ismail") // => "https://meta.fomio.app/u/ismail"
 */
export function toWebUrl(
  fomioUrl: string,
  webDomain: string = 'meta.fomio.app'
): string | null {
  // Extract path from fomio URL
  const match = fomioUrl.match(/^fomio:\/\/(.*)$/);
  if (!match) return null;

  const path = match[1];

  // Map Fomio paths to Discourse web paths
  const byteMatch = path.match(/^byte\/(\d+)/);
  if (byteMatch) {
    return `https://${webDomain}/t/-/${byteMatch[1]}`;
  }

  const profileMatch = path.match(/^profile\/([^/?]+)/);
  if (profileMatch) {
    return `https://${webDomain}/u/${profileMatch[1]}`;
  }

  const teretMatch = path.match(/^teret\/([^/?]+)/);
  if (teretMatch) {
    return `https://${webDomain}/c/${teretMatch[1]}`;
  }

  // Default: return null for paths that don't have web equivalents
  return null;
}

