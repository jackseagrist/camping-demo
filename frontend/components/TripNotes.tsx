import { useState, useRef, useEffect, KeyboardEvent, FocusEvent, RefObject } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Trip, NoteItem } from '../lib/types';
import styles from '../styles/TripNotes.module.css';

interface TripNotesProps {
  trip: Trip;
  onUpdate: (trip: Trip) => void;
}

const TripNotes = ({ trip, onUpdate }: TripNotesProps) => {
  const supabase = createClientComponentClient();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const noteRefs = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize notes from trip or create empty list
  useEffect(() => {
    if (trip) {
      // If trip has notes, use them, otherwise create an empty note
      if (trip.notes && Array.isArray(trip.notes) && trip.notes.length > 0) {
        setNotes(trip.notes);
      } else {
        setNotes([{ id: crypto.randomUUID(), content: '' }]);
      }
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [trip.id]); // Only run when trip ID changes

  // Set initial content for editable divs after DOM elements are available
  useEffect(() => {
    // Populate the content of each editable div from state
    notes.forEach((note, index) => {
      if (noteRefs.current[index]) {
        noteRefs.current[index]!.textContent = note.content;
      }
    });
  }, [notes.length]); // Only run when notes array length changes

  // Save notes to database with debounce
  const saveNotes = async () => {
    if (!trip) return;
    
    // Get current content from DOM
    const currentNotes = notes.map((note, index) => ({
      ...note,
      content: noteRefs.current[index]?.textContent || ''
    }));
    
    // Update state with current content
    setNotes(currentNotes);
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set saving status
    setSaveStatus('saving');
    
    // Create a new timeout
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        
        const { error } = await supabase
          .from('trips')
          .update({ notes: currentNotes })
          .eq('id', trip.id);
  
        if (error) throw error;
        
        // Update the trip in parent component
        onUpdate({ ...trip, notes: currentNotes });
        
        // Update save status
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error saving notes:', error);
        setSaveStatus('error');
      } finally {
        setLoading(false);
      }
    }, 1000); // 1 second debounce
  };

  // Handle key presses in editable divs
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Get current content before updating state
      const updatedNotes = notes.map((note, i) => ({
        ...note,
        content: noteRefs.current[i]?.textContent || ''
      }));
      
      // Create a new note item
      const newId = crypto.randomUUID();
      updatedNotes.splice(index + 1, 0, { id: newId, content: '' });
      
      setNotes(updatedNotes);
      
      // Focus the new note after render
      setTimeout(() => {
        if (noteRefs.current[index + 1]) {
          noteRefs.current[index + 1]?.focus();
        }
        saveNotes();
      }, 0);
    } else if (e.key === 'Backspace' && (!noteRefs.current[index]?.textContent || noteRefs.current[index]?.textContent === '') && notes.length > 1) {
      e.preventDefault();
      
      // Get current content before updating state
      const updatedNotes = notes.map((note, i) => ({
        ...note,
        content: noteRefs.current[i]?.textContent || ''
      }));
      
      // Remove the empty note
      updatedNotes.splice(index, 1);
      
      setNotes(updatedNotes);
      
      // Focus the previous note
      setTimeout(() => {
        const prevIndex = index > 0 ? index - 1 : 0;
        if (noteRefs.current[prevIndex]) {
          noteRefs.current[prevIndex]?.focus();
          
          // Move cursor to end of text
          const range = document.createRange();
          const sel = window.getSelection();
          const node = noteRefs.current[prevIndex]?.childNodes[0] || noteRefs.current[prevIndex];
          if (node) {
            range.setStart(node, node.textContent?.length || 0);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
        saveNotes();
      }, 0);
    } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      // Handle manual save with Ctrl+S or Cmd+S
      e.preventDefault();
      saveNotes();
    }
  };

  // Save changes when a note loses focus
  const handleBlur = (e: FocusEvent<HTMLDivElement>, index: number) => {
    // Trigger save when focus is lost
    saveNotes();
  };

  // Format the last saved time
  const formatLastSaved = (): string => {
    if (!lastSaved) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    } else {
      const hours = lastSaved.getHours().toString().padStart(2, '0');
      const minutes = lastSaved.getMinutes().toString().padStart(2, '0');
      return `at ${hours}:${minutes}`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Trip Notes</h2>
        <div className="flex items-center space-x-2">
          {saveStatus === 'saving' && (
            <span className="text-sm text-gray-500 flex items-center">
              <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && lastSaved && (
            <span className="text-sm text-gray-500">
              Saved {formatLastSaved()}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-500">
              Error saving
            </span>
          )}
          <button
            onClick={saveNotes}
            className="ml-2 px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
            title="Save notes (Ctrl+S)"
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {notes.map((note, index) => (
          <div
            key={note.id}
            className={`flex items-start py-2 pl-3 border-l-2 border-transparent hover:border-emerald-500 transition-colors group ${styles.noteContainer}`}
          >
            <div 
              ref={(el) => { noteRefs.current[index] = el; }}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => handleKeyDown(e, index)}
              onBlur={(e) => handleBlur(e, index)}
              className={`w-full min-h-[24px] focus:outline-none text-gray-700 ${!noteRefs.current[index]?.textContent ? styles.emptyNote : ''}`}
              data-placeholder={index === 0 && (!noteRefs.current[0]?.textContent || noteRefs.current[0]?.textContent === '') ? 'Start typing your notes here...' : ''}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-gray-500">
        <p>Press Enter to add a new line • Delete empty lines with Backspace • Press Ctrl+S to save</p>
      </div>
    </div>
  );
};

export default TripNotes; 