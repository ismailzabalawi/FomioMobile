import { gql } from '@apollo/client';

// Query to get hot bytes (latest topics) from Discourse
export const GET_HOT_BYTES = gql`
  query GetHotBytes {
    hotBytes @rest(type: "HotBytesResponse", path: "/latest.json") {
      topic_list {
        topics {
          id
          title
          last_poster_username
          created_at
          posts_count
          views
          category_id
          pinned
          closed
          archived
          excerpt
          image_url
          like_count
          tags
        }
      }
    }
  }
`;

// Query to get all hubs (categories) from Discourse
export const GET_HUBS = gql`
  query GetHubs {
    hubs @rest(type: "HubsResponse", path: "/categories.json") {
      category_list {
        categories {
          id
          name
          color
          text_color
          slug
          topic_count
          post_count
          description
          description_text
          topic_url
          read_restricted
          permission
          notification_level
          can_edit
          topics_day
          topics_week
          topics_month
          topics_year
          topics_all_time
          subcategory_ids
        }
      }
    }
  }
`;

// Query to get a specific byte (topic) with its comments (posts)
export const GET_BYTE_DETAILS = gql`
  query GetByteDetails($topicId: ID!) {
    byte @rest(type: "ByteResponse", path: "/t/{args.topicId}.json") {
      id
      title
      posts_count
      created_at
      views
      like_count
      category_id
      pinned
      closed
      archived
      tags
      details {
        created_by {
          id
          username
          name
          avatar_template
        }
        last_poster {
          id
          username
          name
          avatar_template
        }
      }
      post_stream {
        posts {
          id
          name
          username
          avatar_template
          created_at
          updated_at
          post_number
          post_type
          reply_count
          reply_to_post_number
          quote_count
          incoming_link_count
          reads
          readers_count
          score
          yours
          topic_id
          topic_slug
          display_username
          primary_group_name
          flair_name
          flair_url
          flair_bg_color
          flair_color
          flair_group_id
          version
          can_edit
          can_delete
          can_recover
          can_wiki
          user_title
          bookmarked
          raw
          actions_summary {
            id
            count
            hidden
            can_act
          }
        }
      }
    }
  }
`;

// Query to get user profile information
export const GET_USER_PROFILE = gql`
  query GetUserProfile($username: String!) {
    userProfile @rest(type: "UserProfileResponse", path: "/u/{args.username}.json") {
      user {
        id
        username
        name
        avatar_template
        title
        badge_count
        primary_group_name
        flair_name
        flair_url
        flair_bg_color
        flair_color
        created_at
        last_posted_at
        last_seen_at
        profile_view_count
        time_read
        recent_time_read
        bio_raw
        bio_cooked
        website
        website_name
        location
        can_edit
        can_edit_username
        can_edit_email
        can_edit_name
        stats {
          topic_count
          post_count
          likes_given
          likes_received
          days_visited
          posts_read_count
          topics_entered
          time_read
        }
        groups {
          id
          name
          display_name
          description
          grant_count
          user_count
          mentionable
          messageable
          visibility_level
          automatic
          primary_group
          title
          grant_trust_level
          incoming_email
          has_messages
          flair_url
          flair_bg_color
          flair_color
          bio_raw
          bio_cooked
          public_admission
          public_exit
          allow_membership_requests
          full_name
          default_notification_level
          membership_request_template
        }
      }
    }
  }
`;

// Query to search across all content
export const SEARCH_CONTENT = gql`
  query SearchContent($query: String!) {
    searchResults @rest(type: "SearchResponse", path: "/search.json?q={args.query}") {
      topics {
        id
        title
        created_at
        like_count
        posts_count
        category_id
        tags
        excerpt
      }
      posts {
        id
        username
        avatar_template
        created_at
        like_count
        post_number
        topic_id
        excerpt
      }
      users {
        id
        username
        name
        avatar_template
      }
      categories {
        id
        name
        color
        slug
        topic_count
      }
    }
  }
`;

// Query to get current user information
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser @rest(type: "CurrentUserResponse", path: "/session/current.json") {
      current_user {
        id
        username
        name
        avatar_template
        title
        badge_count
        primary_group_name
        unread_notifications
        unread_private_messages
        admin
        moderator
        staff
        trust_level
        can_create_topic
        can_send_private_messages
        can_edit
        can_invite_to_forum
        should_be_redirected_to_top
        disable_jump_reply
        custom_fields
        muted_category_ids
        regular_category_ids
        tracked_category_ids
        watched_category_ids
        watched_first_post_category_ids
        muted_tag_ids
        tracked_tag_ids
        watched_tag_ids
        watching_first_post_tag_ids
        can_upload_profile_header
        can_upload_user_card_background
        groups {
          id
          name
          display_name
          description
          grant_count
          user_count
          mentionable
          messageable
          visibility_level
          automatic
          primary_group
          title
          grant_trust_level
          incoming_email
          has_messages
          flair_url
          flair_bg_color
          flair_color
          bio_raw
          bio_cooked
          public_admission
          public_exit
          allow_membership_requests
          full_name
          default_notification_level
          membership_request_template
        }
      }
    }
  }
`;

// Mutation to create a new byte (topic)
export const CREATE_BYTE = gql`
  mutation CreateByte($title: String!, $raw: String!, $category: Int!) {
    createByte @rest(type: "CreateByteResponse", path: "/posts.json", method: "POST") {
      id
      topic_id
      topic_slug
      display_username
      primary_group_name
      flair_name
      flair_url
      flair_bg_color
      flair_color
      version
      can_edit
      can_delete
      can_recover
      user_title
      raw
      actions_summary {
        id
        count
        hidden
        can_act
      }
    }
  }
`;

// Mutation to create a comment (reply to a topic)
export const CREATE_COMMENT = gql`
  mutation CreateComment($raw: String!, $topic_id: Int!, $reply_to_post_number: Int) {
    createComment @rest(type: "CreateCommentResponse", path: "/posts.json", method: "POST") {
      id
      name
      username
      avatar_template
      created_at
      post_number
      post_type
      updated_at
      reply_count
      reply_to_post_number
      quote_count
      incoming_link_count
      reads
      readers_count
      score
      yours
      topic_id
      topic_slug
      display_username
      primary_group_name
      flair_name
      flair_url
      flair_bg_color
      flair_color
      version
      can_edit
      can_delete
      can_recover
      can_wiki
      user_title
      bookmarked
      raw
      actions_summary {
        id
        count
        hidden
        can_act
      }
    }
  }
`;

// Mutation to like a post
export const LIKE_POST = gql`
  mutation LikePost($postId: ID!) {
    likePost @rest(type: "LikeResponse", path: "/post_actions.json", method: "POST") {
      id
      post_action_type_id
      user_id
      post_id
      created_at
      deleted_at
    }
  }
`;

// Mutation to unlike a post
export const UNLIKE_POST = gql`
  mutation UnlikePost($postId: ID!) {
    unlikePost @rest(type: "UnlikeResponse", path: "/post_actions/{args.postId}.json", method: "DELETE") {
      success
    }
  }
`;

// Mutation to bookmark a post
export const BOOKMARK_POST = gql`
  mutation BookmarkPost($postId: ID!) {
    bookmarkPost @rest(type: "BookmarkResponse", path: "/bookmarks.json", method: "POST") {
      id
      user_id
      topic_id
      post_id
      name
      reminder_type
      reminder_at
      created_at
      updated_at
    }
  }
`;

