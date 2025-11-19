import { TopicData } from './useTopic';

/**
 * ByteSummary - Standardized contract for Byte data across the app
 * Used by ByteCard, feeds, and detail views to ensure consistency
 */
export interface ByteSummary {
  id: number;
  title: string;
  hubName: string;
  teretName?: string;
  author: {
    username: string;
    name: string;
    avatarUrl: string;
  };
  stats: {
    likeCount: number;
    replyCount: number;
    viewCount: number;
  };
  unreadCount: number;
  isBookmarked: boolean;
  hasMedia: boolean;
  coverImage?: string;
  createdAt: string;
  lastPostedAt: string;
  slug: string;
  url: string;
}

/**
 * Converts TopicData (from useTopic hook) to ByteSummary format
 * This ensures consistent data structure across ByteCard and ByteBlogPage
 */
export function topicDataToByteSummary(topic: TopicData): ByteSummary {
  return {
    id: topic.id,
    title: topic.title,
    hubName: topic.category.name,
    teretName: undefined, // TODO: Add when teret data is available in TopicData
    author: {
      username: topic.author.username,
      name: topic.author.name,
      avatarUrl: topic.author.avatar,
    },
    stats: {
      likeCount: topic.likeCount,
      replyCount: topic.replyCount,
      viewCount: topic.views,
    },
    unreadCount: topic.unreadCount,
    isBookmarked: topic.bookmarked,
    hasMedia: topic.hasMedia,
    coverImage: topic.coverImage,
    createdAt: topic.createdAt,
    lastPostedAt: topic.updatedAt,
    slug: topic.slug,
    url: topic.url,
  };
}

