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

### Session Events
- `session_started` - When a user starts a new session
  - Properties: referrer, url_path, screen_width, screen_height

### Authentication Events
- `user_signup` - When a user creates a new account
  - Properties: method (email or google), email_domain
- `user_login` - When a user successfully logs in
  - Properties: login_method
- `login_attempt` - When a user attempts to log in with OAuth
  - Properties: provider

### Trip/Plan Events
- `plan_created` - When a user creates a new trip plan
  - Properties: trip_id, trip_type, group_size, duration, experience_level, location
- `trip_viewed` - When a user views a trip detail page
  - Properties: trip_id, trip_title, has_facility, has_dates, trip_status
- `trip_updated` - When a user updates trip details
  - Properties: trip_id, title, location, trip_type, group_size, duration, experience_level
- `trip_deleted` - When a user deletes a trip
  - Properties: trip_id, trip_title, trip_type, trip_location
- `trip_status_changed` - When a trip status is changed
  - Properties: trip_id, previous_status, new_status
- `calendar_export` - When a user exports a trip to calendar
  - Properties: trip_id, trip_title, has_dates

### Collaboration Events
- `collaborator_invited` - When a user invites someone to collaborate
  - Properties: trip_id, trip_title, inviter_email
- `invitation_accepted` - When a user accepts a collaboration invitation
  - Properties: trip_id, trip_title, inviter_email
- `comment_added` - When a user adds a comment to a trip
  - Properties: trip_id, comment_length, has_mentions
- `mention_used` - When a user mentions someone in a comment
  - Properties: trip_id, mention_count, mentioned_users

### Notes & Content Events
- `notes_edited` - When a user edits trip notes
  - Properties: trip_id
- `notes_saved` - When trip notes are saved
  - Properties: trip_id, content_length, has_task_list

### Map & Location Events
- `explore_page_viewed` - When a user visits the explore page
  - Properties: display_mode, location_type
- `filter_applied` - When a user applies filters on explore page
  - Properties: filter_type, filter_values, display_mode, location_type
- `facility_viewed` - When a user views facility details
  - Properties: facility_id, facility_name, facility_type, display_mode
- `facility_selected` - When a user selects a facility for their trip
  - Properties: trip_id, facility_id, facility_name, facility_type, is_custom
- `custom_location_added` - When a user adds a custom location
  - Properties: trip_id, facility_id, facility_name, has_notes

### Profile Events
- `profile_viewed` - When a user views their profile
  - Properties: user_id, email_domain
- `avatar_changed` - When a user changes their profile picture
  - Properties: user_id, file_type, file_size_mb
- `password_reset_requested` - When a user requests a password reset
  - Properties: user_id
- `email_change_requested` - When a user requests an email change
  - Properties: user_id, old_email_domain, new_email_domain

### Beta Limit Events
- `limit_modal_shown` - When the beta limit modal is displayed
  - Properties: type (ai_search or trip_limit)
- `limit_modal_feedback_clicked` - When a user clicks the feedback button in the limit modal
  - Properties: type (ai_search or trip_limit)
- `limit_reached` - When a user hits a beta limit
  - Properties: type (ai_search or trip_limit), current_count

### AI Search Events
- `ai_search_triggered` - When a user performs an AI search
  - Properties: query, userId

## Implementation Details

- PostHog is initialized with `autocapture: true` to automatically track clicks, page views, etc.
- `capture_pageview: false` is set to prevent double-counting page views with Vercel Analytics
- User identification happens after authentication to ensure proper tracking
- Anonymous events are tracked before user authentication
- Custom events are used to track specific user actions and behaviors

## Future Improvements

- Create funnels and dashboards in PostHog to analyze user behavior
- Implement A/B testing using PostHog experiments
- Add more granular tracking for specific UI interactions
- Track time spent on different pages
- Segment users based on activity patterns 