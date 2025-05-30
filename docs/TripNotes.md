# Trip Notes Feature

This document explains how to set up and use the new Trip Notes feature for BaseLodge.

## Overview

The Trip Notes feature allows users to create and maintain editable notes for each trip, similar to a Google Docs experience. The notes support rich-text editing capabilities and function like a list where users can:

- Add new notes by pressing Enter
- Delete empty notes by pressing Backspace
- Edit notes inline

## Database Setup

Before using the feature, you need to update your Supabase database schema:

1. Log in to your Supabase dashboard
2. Go to SQL Editor
3. Run the following SQL:

```sql
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
```

This adds a `notes` column to the `trips` table as a JSONB array.

## Components

The feature consists of two main components:

1. **TripNotes.tsx**: The React component that handles the editable notes interface
2. **Integration in [id].tsx**: The integration in the individual trip page

## How It Works

The notes are stored in the Supabase database as a JSONB array of note items, each with:
- `id`: A unique identifier for the note
- `content`: The text content of the note

The component uses contentEditable divs for rich text editing, with React state management to handle:
- Adding new notes
- Deleting empty notes
- Updating note content
- Saving changes to the database

## Usage

When viewing a trip, users will see a "Trip Notes" section below the packing list. They can:
1. Click to start typing
2. Press Enter to create a new line/note
3. Press Backspace on an empty note to delete it
4. Changes are automatically saved when the user clicks away from a note

## Styling

The notes feature follows the existing BaseLodge design system with:
- Clean, minimal styling
- Consistent font sizes and colors
- Hover states for better user feedback
- Clear visual hierarchy

## Future Enhancements

Potential future enhancements include:
- Rich text formatting (bold, italic, etc.)
- File/image attachments
- Collaborative editing
- Categories or tags for notes 