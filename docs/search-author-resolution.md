# Search Author Resolution

## Summary
Search results can show the author as "Unknown" when the Discourse search response does not include enough user data to resolve the author. This is expected for some search queries and responses where the `users` array is empty.

## What the Search API Returns
Discourse search responses can include:
- `topics` with limited fields
- `users` array (often needed to map `user_id` to username and avatar)

When `users` is empty and the topic object does not include `username` or `user_id`, the author cannot be resolved without an extra API request.

## Current Resolution Strategy
In `shared/discourseApi.ts`, `mapTopicToByte` resolves author data in this order:
1. `topic.details.created_by`
2. Original poster in `topic.posters`
3. Fallback to `topic.username` or `topic.user_id` (if present)
4. Fallback to `topic.last_poster`

If none of the above provide usable data, the author is set to `Unknown User`.

## Why This Happens
Example log indicates `users` array is empty:
- Mapped search results show `"users": 0`
- Topic object does not include author details
- Fallback path results in `Unknown User`

## Optional Next Step (More Expensive)
To guarantee author data even when search responses are incomplete, the app could:
- Fetch the topic by id
- Or fetch the user profile by username

This adds extra network calls and should be used sparingly to avoid performance and rate-limit issues.

## Related Files
- `shared/discourseApi.ts`
- `shared/useSearch.ts`
- `shared/adapters/searchResultToByte.ts`
