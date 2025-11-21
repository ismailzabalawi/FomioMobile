import type { TopicData } from '../useTopic';
import type { Byte as DiscourseByte } from '../discourseApi';
import type { PostItem } from './postItemToByte';
import { topicToByte } from './topicToByte';
import { topicSummaryToByte } from './topicSummaryToByte';
import { discourseByteToByte } from './discourseByteToByte';
import { postItemToByte } from './postItemToByte';
import { searchResultToByte } from './searchResultToByte';
import type { Byte } from '@/types/byte';

/**
 * Type guards for adapter factory
 */
function isTopicData(input: any): input is TopicData {
  return (
    input &&
    typeof input.id === 'number' &&
    typeof input.content === 'string' &&
    input.posts &&
    Array.isArray(input.posts)
  );
}

function isTopicSummary(input: any): input is Parameters<typeof topicSummaryToByte>[0] {
  return (
    input &&
    typeof input.id === 'number' &&
    typeof input.excerpt === 'string' &&
    input.category &&
    typeof input.category.name === 'string'
  );
}

function isDiscourseByte(input: any): input is DiscourseByte {
  return (
    input &&
    typeof input.id === 'number' &&
    (typeof input.content === 'string' || typeof input.excerpt === 'string') &&
    input.author &&
    typeof input.author.username === 'string'
  );
}

function isPostItem(input: any): input is PostItem {
  return (
    input &&
    typeof input.id === 'number' &&
    typeof input.title === 'string' &&
    input.author &&
    typeof input.author.name === 'string'
  );
}

function isSearchResult(input: any): input is Parameters<typeof searchResultToByte>[0] {
  return (
    input &&
    typeof input.id === 'number' &&
    typeof input.title === 'string' &&
    (input.excerpt || input.content)
  );
}

/**
 * Universal adapter factory function
 * Auto-detects input type and routes to appropriate adapter
 */
export function toByte(input: any): Byte {
  if (isTopicData(input)) {
    return topicToByte(input);
  }
  
  if (isTopicSummary(input)) {
    return topicSummaryToByte(input);
  }
  
  if (isDiscourseByte(input)) {
    return discourseByteToByte(input);
  }
  
  if (isPostItem(input)) {
    return postItemToByte(input);
  }
  
  if (isSearchResult(input)) {
    return searchResultToByte(input);
  }
  
  throw new Error(
    `Cannot convert to Byte: unknown input type. Input keys: ${Object.keys(input || {}).join(', ')}`
  );
}

