import type { SearchResult } from '../discourseApi';
import type { SearchResultItem } from './types';

export function mapSearchResultToItems(result: SearchResult | null): SearchResultItem[] {
  if (!result) return [];

  const items: SearchResultItem[] = [];

  result.bytes.forEach((byte) => {
    items.push({ type: 'topic', id: Number(byte.id), byte });
  });

  result.hubs.forEach((hub) => {
    items.push({ type: 'category', id: hub.id, hub });
  });

  result.users.forEach((user) => {
    items.push({ type: 'user', id: user.id, user });
  });

  result.comments.forEach((comment) => {
    items.push({ type: 'post', id: comment.id, comment });
  });

  return items;
}
