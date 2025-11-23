/**
 * Content helper utilities for handling post content, removal status, and avatar URLs
 */

/**
 * Check if content string indicates unavailable content
 * Returns true if content is empty, zero-width space, or explicitly marked unavailable
 */
export function isContentUnavailable(content: string | undefined | null): boolean {
  if (!content) return true;
  const trimmed = content.trim();
  return (
    trimmed === '' ||
    trimmed === '\uFEFF' ||
    trimmed.toLowerCase().includes('[content unavailable]')
  );
}

/**
 * Check if a topic/post has been removed (deleted)
 */
export function isPostRemoved(topic: any): boolean {
  return topic?.deleted_at != null || topic?.post_stream?.posts?.[0]?.deleted_at != null;
}

/**
 * Build full avatar URL from Discourse avatar template
 * @param template - Discourse avatar template (e.g., "/user_avatar/{hostname}/{username}/{size}/{hash}.png")
 * @param size - Desired avatar size in pixels
 * @param baseUrl - Base URL of the Discourse instance (optional, defaults to empty string for relative URLs)
 */
export function buildAvatarUrl(
  template: string,
  size: number = 120,
  baseUrl: string = ''
): string {
  if (!template) return '';
  // Replace {size} placeholder with actual size
  const url = template.replace('{size}', size.toString());
  // If template is already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Otherwise, prepend baseUrl if provided
  return baseUrl ? `${baseUrl}${url}` : url;
}

