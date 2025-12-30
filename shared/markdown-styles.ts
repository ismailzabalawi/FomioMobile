/**
 * Shared markdown styles for consistent rendering across preview and read views
 * Used by ComposeEditor (preview) and MarkdownContent (read)
 */

import { Platform } from 'react-native';
import { getTokens } from './design/tokens';

/**
 * Get markdown styles for react-native-markdown-display
 * Handles theme and Platform internally
 */
export function getMarkdownStyles(mode: 'light' | 'dark' | 'darkAmoled' = 'light') {
  const tokens = getTokens(mode);
  const codeFontFamily = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
  
  const textColor = tokens.colors.text;

  return {
    // Root container - CRITICAL: Set default text color here for inheritance
    body: {
      margin: 0,
      padding: 0,
      color: textColor, // ✅ Default text color for all markdown content
    },
    
    // ✅ Default text style that applies to all text elements
    text: {
      color: textColor,
    },
    
    // Headings
    heading1: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: textColor,
      marginTop: 24,
      marginBottom: 12,
      lineHeight: 32,
    },
    heading2: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: textColor,
      marginTop: 20,
      marginBottom: 10,
      lineHeight: 28,
    },
    heading3: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: textColor,
      marginTop: 16,
      marginBottom: 8,
      lineHeight: 24,
    },
    heading4: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: textColor,
      marginTop: 14,
      marginBottom: 6,
      lineHeight: 22,
    },
    heading5: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: textColor,
      marginTop: 12,
      marginBottom: 6,
      lineHeight: 20,
    },
    heading6: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: textColor,
      marginTop: 10,
      marginBottom: 4,
      lineHeight: 18,
    },
    
    // Paragraphs
    paragraph: {
      fontSize: 16,
      lineHeight: 26,
      color: textColor,
      marginTop: 0,
      marginBottom: 16,
      paddingHorizontal: 0,
    },
    
    // Lists
    listUnordered: {
      marginTop: 8,
      marginBottom: 16,
      paddingLeft: 20,
    },
    listOrdered: {
      marginTop: 8,
      marginBottom: 16,
      paddingLeft: 20,
    },
    listItem: {
      fontSize: 16,
      lineHeight: 26,
      color: textColor,
      marginBottom: 8,
    },
    bullet_list_icon: {
      marginLeft: 0,
    },
    
    // Code
    code_inline: {
      fontSize: 14,
      fontFamily: codeFontFamily,
      backgroundColor: tokens.colors.surfaceMuted,
      color: tokens.colors.accent,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    code_block: {
      fontSize: 14,
      fontFamily: codeFontFamily,
      backgroundColor: tokens.colors.surfaceMuted,
      color: textColor,
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    fence: {
      fontSize: 14,
      fontFamily: codeFontFamily,
      backgroundColor: tokens.colors.surfaceMuted,
      color: textColor,
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    
    // Blockquotes
    blockquote: {
      backgroundColor: tokens.colors.accentSoft,
      borderLeftWidth: 4,
      borderLeftColor: tokens.colors.accent,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 12,
      paddingBottom: 12,
      marginTop: 12,
      marginBottom: 16,
      borderRadius: 4,
    },
    blockquote_text: {
      fontSize: 16,
      lineHeight: 24,
      color: textColor,
      fontStyle: 'italic' as const,
    },
    
    // Links
    link: {
      color: tokens.colors.accent,
      textDecorationLine: 'underline' as const,
      textDecorationColor: tokens.colors.accent + '40', // Lighter underline for better readability
      fontWeight: '500' as const, // Slightly bolder for better visibility
    },
    
    // Images
    image: {
      marginTop: 16,
      marginBottom: 16,
      borderRadius: 8,
      overflow: 'hidden' as const,
    },
    
    // Strong/Emphasis
    strong: {
      fontWeight: '700' as const,
      color: textColor,
    },
    em: {
      fontStyle: 'italic' as const,
      color: textColor,
    },
    
    // Horizontal rule
    hr: {
      backgroundColor: tokens.colors.border,
      height: 1,
      marginTop: 24,
      marginBottom: 24,
    },
    
    // Tables (if Discourse uses them)
    table: {
      marginTop: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: 8,
    },
    thead: {
      backgroundColor: tokens.colors.surfaceMuted,
    },
    tbody: {},
    th: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.colors.border,
      fontWeight: '600' as const,
      color: textColor,
    },
    td: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.colors.border,
      color: textColor,
    },
    tr: {},
  };
}
