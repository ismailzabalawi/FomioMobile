import type { Byte } from '@/types/byte';

const FALLBACK_HTML = '<p>[Content unavailable]</p>';

/**
 * PostItem interface from ProfilePostList.tsx
 * Note: This interface is duplicated here for reference, but the actual definition
 * is in components/profile/ProfilePostList.tsx. This is kept for backward compatibility.
 */
export interface PostItem {
  id: number;
  postId?: number; // Unique post ID for replies (different from topic id)
  title: string;
  hubName: string;
  teretName?: string;
  author: {
    id?: number; // Author user ID
    username?: string; // Author username
    name: string;
    avatar: string;
  };
  excerpt?: string; // Post excerpt/content preview
  replyCount: number;
  likeCount: number;
  createdAt: string;
  lastPostedAt?: string;
  isBookmarked?: boolean;
  hasMedia?: boolean;
  coverImage?: string;
  slug: string;
  draftKey?: string;
  draftSequence?: number;
  rawContent?: string;
  categoryId?: number;
}

/**
 * Adapter to transform PostItem → Byte
 * Uses excerpt if available, otherwise title wrapped in HTML as cooked content
 */
export function postItemToByte(item: PostItem): Byte {
  // Use excerpt if available, otherwise use title wrapped in HTML
  const cooked = item.excerpt 
    ? item.excerpt 
    : (item.title ? `<p>${item.title}</p>` : FALLBACK_HTML);
  
  // Warn if title is missing (telemetry)
  if (!item.title) {
    console.warn('postItemToByte: missing title for post', item.id);
  }
  
  // Extract images from coverImage if available
  const media: string[] = [];
  if (item.coverImage) {
    media.push(item.coverImage);
  }
  
  // Map teretName to teret (no color available from PostItem)
  const teret = item.teretName
    ? {
        id: 0, // PostItem doesn't have teret id
        name: item.teretName,
        color: undefined,
      }
    : undefined;

  return {
    id: item.id,
    title: item.title || 'Untitled', // Required for ByteCard validation
    author: {
      id: item.author.id || 0, // Use author.id if available
      name: item.author.name || 'Unknown User',
      username: item.author.username || 'unknown', // Use author.username if available
      avatar: item.author.avatar || '',
    },
    teret,
    raw: item.rawContent || item.title || FALLBACK_HTML,
    cooked, // Use excerpt if available
    createdAt: item.createdAt,
    origin: item.excerpt ? 'hydrated' : 'summary', // Mark as hydrated if excerpt available, otherwise summary
    media: media.length > 0 ? media : undefined,
    linkPreview: undefined,
    stats: {
      likes: item.likeCount || 0,
      replies: item.replyCount || 0,
      views: undefined, // PostItem doesn't have views
    },
  };
}
