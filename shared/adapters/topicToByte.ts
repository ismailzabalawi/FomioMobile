import type { TopicData } from '../useTopic';
import type { Byte } from '@/types/byte';
import { extractMedia } from '@/lib/utils/media';

const FALLBACK_HTML = '<p>[Content unavailable]</p>';
const FALLBACK_RAW = '[Content unavailable]';

/**
 * Adapter function to transform TopicData → Byte
 * Maps Discourse topic structure to content-first Byte format
 */
export function topicToByte(topic: TopicData): Byte {
  // Use content, fallback to excerpt, then to FALLBACK_HTML
  const cooked = topic.content || topic.posts?.[0]?.content || FALLBACK_HTML;
  
  // Warn if content is missing (telemetry)
  if (!topic.content && !topic.posts?.[0]?.content) {
    console.warn('topicToByte: missing content for topic', topic.id);
  }
  
  // Extract images from HTML content
  const media = extractMedia(cooked);
  
  // Get raw markdown from first post if available
  const raw = topic.posts?.[0]?.raw || FALLBACK_RAW;
  
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
      id: 0, // TopicData doesn't have author.id, using 0 as fallback
      name: topic.author.name || topic.author.username || 'Unknown User',
      username: topic.author.username || 'unknown',
      avatar: topic.author.avatar || '',
    },
    teret,
    raw,
    cooked,
    createdAt: topic.createdAt,
    media: media.length > 0 ? media : undefined,
    // linkPreview is not wired yet - will be added when Discourse provides link metadata
    linkPreview: undefined,
    stats: {
      likes: topic.likeCount || 0,
      replies: topic.replyCount || 0,
      views: topic.views,
    },
  };
}

