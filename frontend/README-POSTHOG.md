# PostHog Analytics Integration

This document outlines how PostHog analytics is integrated with the BaseLodge application.

## Setup

PostHog is initialized in `frontend/posthog.ts` and loaded globally in `_app.js`. The implementation handles SSR safely by only initializing PostHog on the client side.

## User Identification

Users are identified with PostHog in the following places:

1. After login via email/password in `login.tsx`
2. After OAuth login in `auth/callback.tsx`
3. When checking existing sessions in `login.tsx`

User properties tracked:
- Email
- Signup method (email, google, etc.)
- Whether they joined via invitation

## Events Tracked

### Authentication Events
- `user_login` - When a user successfully logs in
- `login_attempt` - When a user attempts to log in with OAuth

### Trip/Plan Events
- `plan_created` - When a user creates a new trip plan
  - Properties: trip_id, trip_type, group_size, duration, experience_level, location

### AI Search Events
- `ai_search_triggered` - When a user performs an AI search
  - Properties: query, userId

### Beta Limit Events
- `limit_modal_shown` - When the beta limit modal is displayed
  - Properties: type (ai_search or trip_limit)
- `limit_modal_feedback_clicked` - When a user clicks the feedback button in the limit modal
  - Properties: type (ai_search or trip_limit)
- `limit_reached` - When a user hits a beta limit
  - Properties: type (ai_search or trip_limit), current_count

## Implementation Details

- PostHog is initialized with `autocapture: true` to automatically track clicks, page views, etc.
- `capture_pageview: false` is set to prevent double-counting page views with Vercel Analytics
- User identification happens after authentication to ensure proper tracking
- Anonymous events are tracked before user authentication

## Future Improvements

- Add more specific event tracking for key user actions
- Implement A/B testing using PostHog experiments
- Create funnels and dashboards in PostHog to analyze user behavior
- Track feature usage to inform product development 