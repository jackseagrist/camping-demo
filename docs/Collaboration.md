# Trip Collaboration Features

This document explains the collaboration features for the camping trip planner application.

## Overview

The collaboration feature allows trip owners to invite other users to collaborate on their trips. Collaborators can view and edit trip details, add notes, and manage the packing list.

## Database Schema

The collaboration system is built on the `trip_collaborators` table with the following structure:

| Column     | Type      | Description                              |
|------------|-----------|------------------------------------------|
| id         | uuid      | Primary key                              |
| trip_id    | uuid      | Reference to the trips table             |
| email      | text      | Email address of the invited user        |
| status     | text      | 'Pending' or 'Accepted'                  |
| invited_at | timestamp | When the invitation was sent             |

## User Flow

### For Trip Owners

1. From any trip detail page, click the "+" button in the collaborator section.
2. Enter the email address of the person you want to invite.
3. Click "Invite" to send the invitation.

The invited user will appear in the collaborator list with a "Pending" status.

### For Invited Users

1. When you log in, check the "Pending Invites" tab on your dashboard.
2. You'll see a list of trips you've been invited to collaborate on.
3. Click "Accept" to join the trip or "Decline" to remove the invitation.

Once you accept an invitation, the trip will appear in your "Your Trips" tab.

## Technical Implementation

### Permissions

- Trip owners can invite, view, and remove collaborators
- Invited users can only see trips they've been invited to
- Only the trip owner and accepted collaborators can view and edit a trip
- Users can only accept/decline invitations sent to their email address

### Security

The collaboration system uses Row Level Security (RLS) policies to ensure that users can only access data they're authorized to see. 

## Future Enhancements

- Email notifications for new invitations
- Different levels of collaborator permissions (view-only, edit, admin)
- Activity log showing who made which changes
- Real-time collaboration with presence indicators 