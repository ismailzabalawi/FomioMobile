import type { Byte } from '@/types/byte';
import { extractMedia } from '@/lib/utils/media';

const FALLBACK_HTML = '<p>[Content unavailable]</p>';

/**
 * Search result topic structure (from search API)
 * Similar to Topic but may have different field names
 */
interface SearchResultTopic {
  id: number;
  title: string;
  excerpt?: string;
  content?: string;
  author?: {
    username: string;
    name: string;
    avatar?: string;
  };
  category?: {
    id: number;
    name: string;
    color?: string;
    slug: string;
  };
  tags?: string[];
  createdAt?: string;
  replyCount?: number;
  likeCount?: number;
  views?: number;
  slug?: string;
  url?: string;
}

/**
 * Adapter to transform search result topic → Byte
 * Handles search-specific field variations
 */
export function searchResultToByte(result: SearchResultTopic): Byte {
  // Use content, fallback to excerpt, then to FALLBACK_HTML
  const cooked = result.content || result.excerpt || FALLBACK_HTML;
  
  // Warn if both content and excerpt are missing (telemetry)
  if (!result.content && !result.excerpt) {
    console.warn('searchResultToByte: missing content and excerpt for result', result.id);
  }
  
  // Extract images from content/excerpt
  const media = extractMedia(cooked);
  
  // Map category to teret
  const teret = result.category
    ? {
        id: result.category.id,
        name: result.category.name,
        color: result.category.color || undefined,
      }
    : undefined;

  return {
    id: result.id,
    author: {
      id: 0, // Search results don't have author.id
      name: result.author?.name || result.author?.username || 'Unknown User',
      username: result.author?.username || 'unknown',
      avatar: result.author?.avatar || '',
    },
    teret,
    raw: '', // Search results typically don't have raw markdown
    cooked,
    createdAt: result.createdAt || new Date().toISOString(),
    media: media.length > 0 ? media : undefined,
    linkPreview: undefined,
    stats: {
      likes: result.likeCount || 0,
      replies: result.replyCount || 0,
      views: result.views,
    },
  };
}

