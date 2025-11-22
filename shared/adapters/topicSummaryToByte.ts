import type { Byte } from '@/types/byte';
import { extractMedia } from '@/lib/utils/media';

// Declare __DEV__ for TypeScript (React Native global)
declare const __DEV__: boolean;

const FALLBACK_HTML = '<p>[Content unavailable]</p>';

/**
 * Topic interface from app/feed/index.tsx
 */
interface Topic {
  id: number;
  title: string;
  excerpt: string;
  author: {
    username: string;
    name: string;
    avatar: string;
  };
  category: {
    id: number;
    name: string;
    color: string;
    slug: string;
  };
  tags: string[];
  createdAt: string;
  replyCount: number;
  likeCount: number;
  isPinned: boolean;
  isClosed: boolean;
  isArchived: boolean;
  lastPostedAt: string;
  lastPoster: {
    username: string;
    name: string;
  };
  views: number;
  slug: string;
  url: string;
  unreadCount?: number;
  isBookmarked?: boolean;
  hasMedia?: boolean;
  coverImage?: string;
}

/**
 * Adapter to transform Topic (from feed/index.tsx) → Byte
 * Uses excerpt as cooked content (HTML excerpt from /latest API)
 */
export function topicSummaryToByte(topic: Topic): Byte {
  // Use excerpt as cooked content, fallback to FALLBACK_HTML
  const cooked = topic.excerpt || FALLBACK_HTML;
  
  // Only warn in development mode (expected for some topics without excerpts)
  if (__DEV__ && !topic.excerpt) {
    console.warn('topicSummaryToByte: missing excerpt for topic', topic.id);
  }
  
  // Extract images from excerpt HTML
  const media = extractMedia(cooked);
  
  // Add coverImage to media if available and not already included
  if (topic.coverImage && !media.includes(topic.coverImage)) {
    media.unshift(topic.coverImage);
  }
  
  // Map category to teret
  const teret = topic.category
    ? {
        id: topic.category.id,
        name: topic.category.name,
        color: topic.category.color || undefined,
      }
    : undefined;

  return {
    id: topic.id,
    author: {
      id: 0, // Topic doesn't have author.id
      name: topic.author.name || topic.author.username || 'Unknown User',
      username: topic.author.username || 'unknown',
      avatar: topic.author.avatar || '',
    },
    teret,
    raw: '', // Excerpts don't have raw markdown
    cooked,
    createdAt: topic.createdAt,
    media: media.length > 0 ? media : undefined,
    linkPreview: undefined,
    stats: {
      likes: topic.likeCount || 0,
      replies: topic.replyCount || 0,
      views: topic.views,
    },
  };
}

