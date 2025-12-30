# Onebox Compliance Implementation

## Overview

This document details the implementation of full Onebox compliance in Fomio's MarkdownContent component, ensuring that Discourse link previews (oneboxes) are properly rendered, clickable, and accessible.

## Reference

- [Discourse Onebox Documentation](https://meta.discourse.org/t/creating-rich-link-previews-with-onebox/98088)
- Implementation Plan: `.cursor/plans/onebox_compliance_implementation_9933e0a1.plan.md`

## Implementation Summary

### What Was Implemented

1. **OneboxRenderer Component** - A dedicated component that makes oneboxes clickable and accessible
2. **Helper Functions** - Extraction utilities for onebox data (URL, title, image, site name)
3. **linkMetadata Integration** - Support for enhanced metadata when available from backend
4. **Accessibility Improvements** - Proper ARIA labels, roles, and hints for screen readers
5. **Image Handling** - Verified existing img renderer properly handles onebox images

### Files Modified

- `components/feed/MarkdownContent.tsx` - Main implementation file

## Technical Details

### OneboxRenderer Component

Located in `components/feed/MarkdownContent.tsx`, the `OneboxRenderer` component:

- Extracts the onebox URL from `data-url` attribute or finds first `<a href>` within the onebox
- Wraps content in `TouchableOpacity` to make entire onebox clickable
- Uses existing `renderLink.onPress` pattern (same as regular links)
- Maintains current styling via `oneboxContainerStyle`
- Handles accessibility with proper roles and labels

**Key Features:**
- Clickable: Entire onebox is tappable to open the linked URL
- Metadata Support: Uses `linkMetadata` prop when available for enhanced rendering
- Accessibility: Proper `accessibilityRole="link"`, labels, and hints
- Fallback: Gracefully handles missing URLs or metadata

### Helper Functions

Four new helper functions were added:

1. **`extractOneboxUrl(tnode)`**
   - Checks `data-url` attribute first (Discourse standard)
   - Falls back to `findFirstHref(tnode)` if not found
   - Returns the URL string or null

2. **`extractOneboxTitle(tnode)`**
   - Finds `.onebox-title` element within the onebox
   - Extracts text content recursively
   - Returns title string or null

3. **`extractOneboxImage(tnode)`**
   - Finds `.onebox-image` element
   - Locates `<img>` tag within it
   - Returns image src URL or null

4. **`extractOneboxSiteName(tnode)`**
   - Finds `.onebox-site-name` element
   - Extracts text content
   - Returns site name string or null

### linkMetadata Integration

The `linkMetadata` prop (previously unused with `_linkMetadata` prefix) is now:

- Properly typed and used in the component
- Passed to `OneboxRenderer` for enhanced rendering
- Used to provide better accessibility labels and titles
- Falls back to HTML-extracted content if unavailable

**linkMetadata Structure:**
```typescript
Record<string, {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  publishedAt?: string;
  type?: 'article' | 'video' | 'post' | 'generic';
}>
```

### Image Handling

Onebox images are handled by the existing `img` renderer which:

- Uses `expo-image` for optimized image loading
- Wraps images in `TouchableOpacity` (ready for lightbox implementation)
- Applies proper styling via `.onebox-image` CSS class
- Handles both explicit-sized and full-width images

### Accessibility

All oneboxes now include:

- `accessibilityRole="link"` - Proper semantic role
- `accessibilityLabel` - Uses metadata title, extracted title, URL, or fallback
- `accessibilityHint="Opens link in browser"` - Clear user guidance
- Proper focus handling via TouchableOpacity

## Usage

Oneboxes are automatically detected and rendered when Discourse includes `<aside class="onebox">` elements in the cooked HTML. No additional configuration is needed.

### Example Onebox HTML Structure

```html
<aside class="onebox" data-url="https://example.com/article">
  <article class="onebox-body">
    <h3 class="onebox-title">Article Title</h3>
    <p>Article description...</p>
    <div class="onebox-image">
      <img src="https://example.com/image.jpg" alt="Preview">
    </div>
    <div class="onebox-site-name">example.com</div>
  </article>
</aside>
```

## Compliance Status

### Fully Implemented ✅

- Onebox detection and rendering
- Clickable oneboxes (opens URL in browser)
- CSS styling for all onebox classes
- Accessibility support
- linkMetadata integration
- Image optimization and handling
- Helper functions for data extraction

### Future Enhancements (Out of Scope)

- Special onebox type detection (Wikipedia, Twitter, etc.) with custom rendering
- Inline oneboxing support (replacing inline links with titles)
- Onebox caching/optimization
- Custom onebox templates for specific domains

## Testing

When testing onebox functionality:

1. **Various Onebox Types**: Test with Wikipedia, Twitter, YouTube, and generic link previews
2. **Clickability**: Verify tapping onebox opens correct URL in browser
3. **Metadata**: Test with and without linkMetadata prop
4. **Accessibility**: Verify screen reader announces onebox correctly
5. **Themes**: Test in Light, Dark, and AMOLED Dark themes
6. **Quote Blocks**: Ensure quote blocks still work correctly (separate from oneboxes)

## Code References

### Key Components

- `OneboxRenderer` - Lines 82-135 in `components/feed/MarkdownContent.tsx`
- `extractOneboxUrl` - Helper function for URL extraction
- `extractOneboxTitle` - Helper function for title extraction
- `extractOneboxImage` - Helper function for image extraction
- `extractOneboxSiteName` - Helper function for site name extraction

### Integration Points

- `aside` renderer (lines 308-324) - Routes oneboxes to OneboxRenderer
- `htmlRenderers` useMemo (line 248) - Includes OneboxRenderer in renderer map
- `linkMetadata` prop (line 163) - Now properly used instead of prefixed with underscore

## Related Documentation

- [Discourse Formatting Guide](./discourse-theme-fomio.md)
- [ByteBlogPage Improvements](./byteblogpage-improvements.md) - Related improvements to ByteBlogPage
- [MarkdownContent Component](../components/feed/MarkdownContent.tsx)
- [ByteCardMedia Component](../components/bytes/ByteCardMedia.tsx) - Similar link preview pattern

