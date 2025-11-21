import type { Byte } from '@/types/byte';

const FALLBACK_HTML = '<p>[Content unavailable]</p>';

/**
 * PostItem interface from ProfilePostList.tsx
 */
export interface PostItem {
  id: number;
  title: string;
  hubName: string;
  teretName?: string;
  author: {
    name: string;
    avatar: string;
  };
  replyCount: number;
  likeCount: number;
  createdAt: string;
  lastPostedAt?: string;
  isBookmarked?: boolean;
  hasMedia?: boolean;
  coverImage?: string;
  slug: string;
}

/**
 * Adapter to transform PostItem → Byte
 * Uses title wrapped in HTML as cooked content
 */
export function postItemToByte(item: PostItem): Byte {
  // Use title wrapped in HTML as cooked content
  const cooked = item.title ? `<p>${item.title}</p>` : FALLBACK_HTML;
  
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
    author: {
      id: 0, // PostItem doesn't have author.id
      name: item.author.name || 'Unknown User',
      username: 'unknown', // PostItem doesn't have username
      avatar: item.author.avatar || '',
    },
    teret,
    raw: item.title || FALLBACK_HTML,
    cooked,
    createdAt: item.createdAt,
    media: media.length > 0 ? media : undefined,
    linkPreview: undefined,
    stats: {
      likes: item.likeCount || 0,
      replies: item.replyCount || 0,
      views: undefined, // PostItem doesn't have views
    },
  };
}

