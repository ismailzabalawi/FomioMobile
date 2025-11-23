import type { Byte as DiscourseByte } from '../discourseApi';
import type { Byte } from '@/types/byte';
import { extractMedia } from '@/lib/utils/media';
import { isContentUnavailable, isPostRemoved } from '../utils/content-helpers';
import type { UserData } from '../utils/user-helpers';

// Declare __DEV__ for TypeScript (React Native global)
declare const __DEV__: boolean;

const REMOVED_POST_HTML = '<p><i>This post was removed</i></p>';
const NO_CONTENT_HTML = '<p>This post has no text content.</p>';

/**
 * Adapter to transform Byte (from discourseApi) → Byte (for new ByteCard)
 * 
 * Pure function - no async calls, no side effects
 * 
 * @param byte - Discourse Byte object
 * @param userMap - Optional map of pre-resolved user data (userId -> UserData)
 */
export function discourseByteToByte(
  byte: DiscourseByte,
  userMap?: Map<number, UserData>
): Byte {
  // Detect if this is a summary (has excerpt but no full content) or full topic
  // A summary has excerpt but content is either empty or same as excerpt
  // A full topic has content that's different/longer than excerpt
  const hasFullContent = byte.content && 
                        byte.content !== byte.excerpt && 
                        byte.content.length > (byte.excerpt?.length || 0);
  const isSummary = !hasFullContent && !!byte.excerpt;
  
  // Check if post was removed
  const isRemoved = isPostRemoved(byte as any);
  
  let cooked: string;
  if (isRemoved) {
    cooked = REMOVED_POST_HTML;
  } else if (isContentUnavailable(byte.content) && isContentUnavailable(byte.excerpt)) {
    // Only show "no content" if neither content nor excerpt exist
    cooked = NO_CONTENT_HTML;
  } else {
    // Prefer full content, fallback to excerpt
    cooked = byte.content || byte.excerpt || NO_CONTENT_HTML;
  }
  
  // Extract media from cooked HTML (only if we have real content)
  const media = !isRemoved && !isContentUnavailable(cooked) 
    ? extractMedia(cooked) 
    : [];
  
  // Map rawContent to raw (only if available)
  const raw = byte.rawContent || '';
  
  // Map category to teret
  const teret = byte.category
    ? {
        id: byte.category.id,
        name: byte.category.name,
        color: byte.category.color || undefined,
      }
    : undefined;

  // Resolve author from userMap if available, otherwise use byte.author
  const authorId = typeof byte.author.id === 'string' 
    ? parseInt(byte.author.id, 10) || 0 
    : (byte.author.id || 0);
  
  const userFromMap = userMap?.get(authorId);
  const author = userFromMap || {
    id: authorId,
    name: byte.author.name || byte.author.username || 'Unknown User',
    username: byte.author.username || 'unknown',
    avatar: byte.author.avatar || '',
  };

  // Use createdAt, fallback to lastActivity
  const createdAt = byte.createdAt || (byte as any).lastActivity || new Date().toISOString();

  return {
    id: byte.id,
    author,
    teret,
    raw,
    cooked,
    createdAt,
    updatedAt: (byte as any).updatedAt || createdAt,
    origin: isSummary ? 'summary' : 'hydrated', // Set origin based on data source
    media: media.length > 0 ? media : undefined,
    linkPreview: undefined, // TODO: Extract from cooked HTML
    stats: {
      likes: byte.likeCount || 0,
      replies: byte.replyCount || 0,
      views: (byte as any).viewCount,
    },
    // Add engagement state if available
    isLiked: (byte as any).isLiked || false,
    isBookmarked: (byte as any).isBookmarked || false,
  };
}

