import type { Byte as DiscourseByte } from '../discourseApi';
import type { Byte } from '@/types/byte';
import { extractMedia } from '@/lib/utils/media';

const FALLBACK_HTML = '<p>[Content unavailable]</p>';
const FALLBACK_RAW = '[Content unavailable]';

/**
 * Adapter to transform Byte (from discourseApi) → Byte (for new ByteCard)
 * Maps content/excerpt to cooked, rawContent to raw
 */
export function discourseByteToByte(byte: DiscourseByte): Byte {
  // Use content, fallback to excerpt, then to FALLBACK_HTML
  const cooked = byte.content || byte.excerpt || FALLBACK_HTML;
  
  // Warn if both content and excerpt are missing (telemetry)
  if (!byte.content && !byte.excerpt) {
    console.warn('discourseByteToByte: missing content and excerpt for byte', byte.id);
  }
  
  // Extract images from content/excerpt
  const media = extractMedia(cooked);
  
  // Map rawContent to raw
  const raw = byte.rawContent || FALLBACK_RAW;
  
  // Map category to teret
  const teret = byte.category
    ? {
        id: byte.category.id,
        name: byte.category.name,
        color: byte.category.color || undefined,
      }
    : undefined;

  return {
    id: byte.id,
    author: {
      id: byte.author.id || 0,
      name: byte.author.name || byte.author.username || 'Unknown User',
      username: byte.author.username || 'unknown',
      avatar: byte.author.avatar || '',
    },
    teret,
    raw,
    cooked,
    createdAt: byte.createdAt,
    media: media.length > 0 ? media : undefined,
    linkPreview: undefined,
    stats: {
      likes: byte.likeCount || 0,
      replies: byte.replyCount || 0,
      views: byte.viewCount,
    },
  };
}

