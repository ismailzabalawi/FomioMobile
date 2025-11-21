/**
 * Media extraction utilities for parsing HTML content
 * Extracts image URLs from HTML strings, skipping emoji images
 */

/**
 * Extract all image URLs from HTML content
 * Skips emoji images (those with 'emoji' in class attribute)
 */
export function extractMedia(html: string): string[] {
  if (!html) return [];
  
  const imageUrls: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    // Skip if it's an emoji (check surrounding context for 'emoji' class)
    const contextStart = Math.max(0, match.index - 50);
    const contextEnd = match.index + match[0].length;
    const context = html.substring(contextStart, contextEnd);
    
    if (!context.includes('emoji') && !context.includes('class="emoji"')) {
      imageUrls.push(src);
    }
  }
  
  return imageUrls;
}

/**
 * Extract the first image URL from HTML content
 * Returns null if no images found
 */
export function extractFirstImage(html: string): string | null {
  if (!html) return null;
  
  const images = extractMedia(html);
  return images.length > 0 ? images[0] : null;
}

/**
 * Strip HTML tags from string (optional utility)
 * Useful for creating fallback text content
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

