# Fomio Wireframes and Navigation Map

This document captures the current navigation structure and a low-fidelity wireframe set for the entire app. It is meant to be edited as screens evolve.

## Navigation Map (Current)

```
Root
├─ Welcome (/)
│  ├─ Get Started -> (auth)
│  ├─ Sign In -> (auth)/signin
│  └─ Explore -> (tabs)
├─ (auth) stack
│  ├─ onboarding
│  ├─ signin
│  ├─ signup
│  └─ auth-modal (full-screen)
├─ (tabs) stack
│  ├─ Feed (index)
│  │  └─ Byte Detail (/feed/[byteId])
│  ├─ Search
│  ├─ Compose
│  ├─ Notifications
│  └─ Profile
│     ├─ Profile tabs (Bytes, Replies, Likes, Bookmarks)
│     ├─ Edit Profile (/(profile)/edit-profile)
│     ├─ Settings (/(profile)/settings)
│     └─ Notification Settings (/(profile)/notification-settings)
├─ Public Profile
│  └─ /profile/[username]
└─ Protected
   └─ /(protected)/notifications (legacy or alternate route)
```

## Global Navigation Model

```
Bottom Fluid Bar (tabs)
[Compose] [Feed] [Search] [Notifications] [Profile]
Right action button is contextual:
- Feed/Search: Scroll-to-top
- Notifications: Mark all read
- Profile: Edit profile (own only)
```

## Wireframes (Low Fidelity)

### 1) Welcome (root /)
```
------------------------------------------------
Header: "Welcome to Fomio"
Subheader: Short value prop

[ Logo ]
[ Hero line ]

[ Get Started ]  (primary)
[ Sign In ]      (secondary)
[ Explore ]      (ghost)
------------------------------------------------
```

### 2) Onboarding (/ (auth)/onboarding)
```
------------------------------------------------
[ Progress dots ]
[ Illustrations or onboarding cards ]
[ Value prop / Benefit ]

[ Continue ] [ Skip ]
------------------------------------------------
```

### 3) Sign In / Sign Up
```
------------------------------------------------
[ Logo ]
[ Title: Sign In ]

[ Email ]
[ Password ]

[ Primary CTA ]
[ Secondary: Create account / Already have one? ]
------------------------------------------------
```

### 4) Feed (tabs/index)
```
------------------------------------------------
Header: centered logo
[ Inline error banner if needed ]

[ Byte Card ]
[ Byte Card ]
[ Byte Card ]

Footer: loading / no more
------------------------------------------------
```

### 5) Byte Detail (/feed/[byteId])
```
------------------------------------------------
Header: back
[ Byte content ]
[ Actions: like, reply, bookmark, share ]
[ Replies list ]

[ Reply composer ]
------------------------------------------------
```

### 6) Search (tabs/search)
```
------------------------------------------------
Header: search field
[ Filters / suggestions ]

[ Result Card ]
[ Result Card ]
------------------------------------------------
```

### 7) Compose (tabs/compose)
```
------------------------------------------------
Header: cancel / post
[ Title or prompt ]
[ Text area ]
[ Attachments / tags / extras ]
------------------------------------------------
```

### 8) Notifications (tabs/notifications)
```
------------------------------------------------
Header: Notifications
[ Filter chips: All / Replies / Mentions / System ]

[ Notification row ]
[ Notification row ]

Empty state / permissions prompt
------------------------------------------------
```

### 9) Profile (tabs/profile)
```
------------------------------------------------
[ Profile header ]
[ Bio ]
[ Stats ]

[ Tabs: Bytes | Replies | Likes | Bookmarks ]
[ Tab content list ]
------------------------------------------------
```

### 10) Edit Profile (/(profile)/edit-profile)
```
------------------------------------------------
Header: back / save
[ Avatar ]
[ Display name ]
[ Bio ]
[ Links ]
------------------------------------------------
```

### 11) Settings (/(profile)/settings)
```
------------------------------------------------
Header: Settings
[ Account ]
[ Privacy ]
[ Appearance ]
[ Notifications ] -> Notification Settings
[ About / Legal ]
------------------------------------------------
```

### 12) Notification Settings (/(profile)/notification-settings)
```
------------------------------------------------
Header: Notification Settings
[ Push toggle ]
[ Email toggle ]
[ Categories ]
------------------------------------------------
```

### 13) Public Profile (/profile/[username])
```
------------------------------------------------
[ Profile header ]
[ Bio ]
[ Stats ]
[ Public tabs: Bytes | Replies ]
------------------------------------------------
```

## Gaps / Questions to Resolve

1) Is /(protected)/notifications still a path we want, or should we consolidate on the tab route?
2) Does Compose need its own stack (drafts, editor settings) or stay as a single screen?
3) Should Search include a secondary tab for people or tags?
4) Do we want a dedicated "Messages" or "Inbox" top-level tab?

