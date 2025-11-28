# Feed Rendering Debug Checklist

## Pre-Test Setup
- [ ] Ensure app is in development mode (`__DEV__ = true`)
- [ ] Clear app cache/data if needed
- [ ] Ensure authenticated state
- [ ] Open React Native debugger/console

## Test 1: API Response Validation
1. Open app and navigate to home feed
2. Check console for: `🔍 [LatestFeed] API Response` or `🔍 [CategoryFeed] API Response`
3. Verify:
   - [ ] `hasTopicList: true`
   - [ ] `topicsCount > 0`
   - [ ] `hasTopicListCategories: true` OR `hasRootCategories: true`
   - [ ] `topicListCategoriesCount > 0` OR `rootCategoriesCount > 0`

**Expected:** All checks should pass. If `categoriesCount: 0`, categories are missing from API response.

**Fix if failing:** Check if Discourse API structure changed. Categories might be at root level instead of `topic_list.categories`.

## Test 2: Category Source Validation
1. Check console for: `🔍 [LatestFeed] Categories source:` or `🔍 [CategoryFeed] Categories source:`
2. Verify:
   - [ ] `using > 0` (categories are being used)
   - [ ] `fromTopicList > 0` OR `fromRoot > 0` (categories found somewhere)
   - [ ] `sampleCategory` shows valid category data

**Expected:** Categories should be found and used from the correct source.

## Test 3: Category Extraction
1. Check console for: `🔍 useFeed: Category extraction`
2. Verify:
   - [ ] `categoriesCount > 0`
   - [ ] `categoryMapSize > 0`
   - [ ] `hubsCount >= 0` (can be 0 if all are terets)
   - [ ] `teretsCount >= 0` (can be 0 if all are hubs)
   - [ ] `firstTopicHasCategory: true`
   - [ ] `topicsWithCategories > 0`
   - [ ] `topicsWithoutCategories` should be minimal

**Expected:** Categories should be extracted and mapped correctly. Most topics should have categories.

## Test 4: Topic Enrichment
1. Check console for: `🔍 useFeed: After enrichment`
2. Verify:
   - [ ] `topicsWithCategory > 0`
   - [ ] `firstTopicCategory` is not null
   - [ ] If terets exist: `topicsWithParentHub > 0`
   - [ ] `sampleEnriched` shows valid category and parentHub data

**Expected:** Topics should have category data attached. Terets should have parent hubs.

## Test 5: Badge Creation
1. Check console for: `🔍 topicSummaryToByte: Badge creation`
2. For each topic, verify:
   - [ ] `hasCategory: true` if topic has category_id
   - [ ] `isHub` OR `isTeret` is true (not both, unless data is wrong)
   - [ ] `hubCreated: true` OR `teretCreated: true` (if category exists)
   - [ ] If teret: `parentHubCreated: true`

**Expected:** Badges should be created for topics with categories.

**Watch for warnings:**
- `⚠️ Topic X has category_id Y but no category data` - Category map issue
- `⚠️ Topic X is a Teret but parent hub not found` - Parent category missing
- `⚠️ Topic X has category_id Y but is neither Hub nor Teret` - Logic issue

## Test 6: Byte Validation
1. Check console for: `🔍 useFeed: Byte badge validation`
2. Verify:
   - [ ] `bytesWithHubs > 0` OR `bytesWithTerets > 0`
   - [ ] `bytesWithNeither` should be minimal (only uncategorized topics)
   - [ ] `sampleBytes` show correct hub/teret data with names and colors

**Expected:** Most bytes should have badge data. Sample bytes should show valid badge info.

## Test 7: Component Rendering
1. Check console for: `🔍 [ByteCard X] Rendering` (first 3 items)
2. Verify each card has:
   - [ ] Valid `id` (number or string)
   - [ ] `hasHub: true` OR `hasTeret: true` (if category exists)
   - [ ] Valid badge names and colors

**Expected:** ByteCards should have badge data when categories exist.

## Test 8: Footer Rendering
1. Check console for: `🔍 [ByteCardFooter] Rendering badges`
2. Verify:
   - [ ] `willRender: true` if badges exist
   - [ ] Badge names and colors are valid

**Expected:** Footer should render badges when data exists.

## Test 9: Visual Inspection
1. Scroll through feed
2. Visually verify:
   - [ ] Hub badges appear (left side, gray or category color)
   - [ ] Teret badges appear (right side, category color)
   - [ ] Both badges appear for teret topics
   - [ ] Badge colors are visible and readable
   - [ ] Badge text is readable

**Expected:** Badges should be visible in the UI.

## Common Issues & Solutions

### Issue: categoriesCount: 0
**Symptoms:** 
- `topicListCategoriesCount: 0` in API Response log
- `categoriesCount: 0` in Category extraction log

**Cause:** API response structure changed or categories not included

**Solution:** 
1. Check if categories are in `response.data.categories` instead of `response.data.topic_list.categories`
2. Verify Discourse API version and endpoint structure
3. Check if API requires additional query parameters to include categories

### Issue: topicsWithCategory: 0
**Symptoms:**
- `topicsWithCategory: 0` in After enrichment log
- All topics show `hasCategory: false`

**Cause:** Category IDs don't match between topics and category map

**Solution:**
1. Verify `topic.category_id` matches category IDs in map
2. Check if category IDs are strings vs numbers (type mismatch)
3. Verify category map is built correctly

### Issue: parentHubCreated: false for terets
**Symptoms:**
- `⚠️ Topic X is a Teret but parent hub not found` warnings
- `topicsWithParentHub: 0` when terets exist

**Cause:** Parent category not in category map

**Solution:**
1. Ensure API includes all parent categories in response
2. Check if parent categories need to be fetched separately
3. Verify `parent_category_id` values are correct

### Issue: Badges not visible
**Symptoms:**
- Data exists in logs (`willRender: true`)
- But badges don't appear in UI

**Cause:** Rendering or styling issue

**Solution:**
1. Check ByteCardFooter conditions: `{(byte.hub || byte.teret) && ...}`
2. Verify badge styling (backgroundColor, text color)
3. Check if badges are hidden by layout (overflow, z-index)
4. Verify NativeWind classes are working

### Issue: Badge colors not showing
**Symptoms:**
- Badges appear but are default gray/blue
- `hubColor` or `teretColor` is undefined in logs

**Cause:** Color formatting or missing color data

**Solution:**
1. Check if Discourse returns colors with or without `#` prefix
2. Verify color formatting in `topicSummaryToByte`
3. Check if category color is in API response

## Quick Debug Commands

### In React Native Debugger Console:
```javascript
// Get first byte from feed
const firstByte = feedState.bytes[0];
console.log('First Byte Debug:', {
  id: firstByte.id,
  hub: firstByte.hub,
  teret: firstByte.teret,
});

// Check category map
console.log('Category Map:', Array.from(categoryMap.entries()));
```

### Force Test Badge Rendering:
Add this temporarily to `ByteCardFooter.tsx`:
```typescript
{/* TEMP DEBUG: Force show badges */}
<View className="flex-row items-center gap-2">
  <Text className="px-2 py-0.5 rounded-full text-xs text-white font-medium bg-red-500">
    TEST HUB
  </Text>
  <Text className="px-2 py-0.5 rounded-full text-xs text-white font-medium bg-blue-500">
    TEST TERET
  </Text>
</View>
```

If test badges show, rendering works - issue is data. If they don't, issue is layout/styling.

## Success Criteria

✅ All tests pass
✅ Badges appear for topics with categories
✅ Hub badges show for top-level categories
✅ Teret badges show for subcategories
✅ Both badges show for teret topics
✅ Badge colors are visible and match category colors
✅ No console warnings about missing data
✅ Feed loads and renders correctly

