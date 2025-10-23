import { Trip } from '../lib/types';
import { useCallback } from 'react';
import posthog from '../posthog';
import { format } from 'date-fns';

interface ShareToNotesButtonProps {
  trip: Trip;
}

export function ShareToNotesButton({ trip }: ShareToNotesButtonProps) {
  // Format date range if available
  let dateRange = "";
  if (trip.start_date && trip.end_date) {
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    dateRange = `Dates: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  }
  
  // Prepare participants list
  let participants = "(no participants yet)";
  if (trip.collaborators && trip.collaborators.length > 0) {
    participants = trip.collaborators.map(c => `• ${c.email}`).join("\n");
  }
  
  const payload = [
    `🗺️ ${trip.title}`,
    dateRange,
    trip.location ? `Location: ${trip.location}` : "",
    "",
    "— Trip Notes —",
    getPlainTextContent(trip.notes) || "(no notes yet)",
    "",
    "— Participants —",
    participants,
    "",
    `Open in BaseLodge: ${typeof window !== 'undefined' ? window.location.href : ''}`
  ]
  .filter(Boolean)
  .join("\n");

  const share = useCallback(async () => {
    const canShare = !!(navigator as any).share;
    
    try {
      if (!canShare) {
        await navigator.clipboard.writeText(payload);
        alert("Notes copied to clipboard. Open Notes and paste!");
        
        // Track the copy event
        posthog.capture('notes_shared_to_clipboard', {
          trip_id: trip.id,
          content_length: payload.length
        });
        
        return;
      }
      
      await (navigator as any).share({
        title: `Trip: ${trip.title}`,
        text: payload, // iOS Notes will use this as the note body
      });
      
      // Track the share event
      posthog.capture('notes_shared_to_iphone', {
        trip_id: trip.id,
        content_length: payload.length
      });
    } catch (error) {
      console.error('Error sharing notes:', error);
    }
  }, [trip, payload]);

  return (
    <button
      onClick={share}
      className="inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg shadow-sm hover:bg-gray-800 transition-colors w-full"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
      </svg>
      Share to Notes
    </button>
  );
}

// Convert editor content to plain text for export
function getPlainTextContent(notes: any): string {
  if (!notes || !notes.content) return '';
  
  // Convert the JSON content to plain text
  let plainText = '';
  
  // Helper function to recursively extract text from nodes
  const extractText = (nodes: any[]) => {
    if (!nodes) return;
    
    nodes.forEach(node => {
      if (node.type === 'text') {
        plainText += node.text;
      } else if (node.type === 'paragraph') {
        extractText(node.content);
        plainText += '\n\n';
      } else if (node.type === 'heading') {
        extractText(node.content);
        plainText += '\n\n';
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        extractText(node.content);
        plainText += '\n';
      } else if (node.type === 'listItem') {
        plainText += '• ';
        extractText(node.content);
      } else if (node.type === 'taskList') {
        extractText(node.content);
        plainText += '\n';
      } else if (node.type === 'taskItem') {
        plainText += node.attrs.checked ? '[✓] ' : '[ ] ';
        extractText(node.content);
        plainText += '\n';
      } else if (node.content) {
        extractText(node.content);
      }
    });
  };
  
  if (notes.content) {
    extractText(notes.content);
  }
  
  return plainText.trim();
}
