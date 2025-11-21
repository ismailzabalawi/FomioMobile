/**
 * Adapter functions to transform various data types to Byte format
 * for use with the new content-first ByteCard component
 */

// Individual adapters
export { topicToByte } from './topicToByte';
export { topicSummaryToByte } from './topicSummaryToByte';
export { discourseByteToByte } from './discourseByteToByte';
export { postItemToByte } from './postItemToByte';
export type { PostItem } from './postItemToByte';
export { searchResultToByte } from './searchResultToByte';

// Universal factory adapter
export { toByte } from './toByte';

