import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Trip } from '../lib/types';
import { useEditor, EditorContent, Editor, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlock from '@tiptap/extension-code-block';
import Code from '@tiptap/extension-code';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { InputRule } from '@tiptap/core';
import styles from '../styles/TipTapEditor.module.css';

interface TripNotesProps {
  trip: Trip;
  onUpdate: (trip: Trip) => void;
}

interface SlashCommand {
  title: string;
  description: string;
  icon: string;
  action: (editor: Editor) => void;
}

// Custom extension for task input rule
const TaskInputRule = Extension.create({
  name: 'taskInputRule',
  
  addInputRules() {
    return [
      // Convert [] at the beginning of a line to a task list
      new InputRule({
        find: /^\s*\[\]\s$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          
          // Delete the [] characters
          tr.delete(range.from, range.to);
          
          // Insert a task list
          const taskList = {
            type: 'taskList',
            content: [{
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph' }]
            }]
          };
          
          const node = state.schema.nodeFromJSON(taskList);
          tr.replaceRangeWith(range.from, range.from, node);
        },
      }),
    ];
  },
});

const TripNotes = ({ trip, onUpdate }: TripNotesProps) => {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Initialize the editor with content from trip.notes
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Keep default list types enabled
      }),
      Underline,
      Code,
      CodeBlock,
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      TaskInputRule,
      Placeholder.configure({
        placeholder: 'Type "/" for commands or "[]" for tasks...',
      }),
    ],
    content: trip.notes || {},
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none',
      },
      handleKeyDown: (view, event) => {
        // Check for slash key to show the menu
        if (event.key === '/' && !showSlashMenu) {
          const { state } = view;
          const { selection } = state;
          const { ranges } = selection;
          const from = Math.min(...ranges.map(range => range.$from.pos));
          
          // Get the DOM position for the menu
          const domPos = view.coordsAtPos(from);
          
          if (editorContainerRef.current) {
            const containerRect = editorContainerRef.current.getBoundingClientRect();
            
            setSlashMenuPosition({
              top: domPos.bottom - containerRect.top,
              left: domPos.left - containerRect.left,
            });
          }
          
          setShowSlashMenu(true);
          // Don't return true here, let the slash character be inserted
          return false;
        }
        
        // Hide menu on escape
        if (event.key === 'Escape' && showSlashMenu) {
          setShowSlashMenu(false);
          return true;
        }
        
        // Check for [] to create a task list
        if (event.key === ']' && view.state.doc.textBetween(
          Math.max(0, view.state.selection.from - 1),
          view.state.selection.from
        ) === '[') {
          // Delete the [] characters
          view.dispatch(
            view.state.tr.delete(
              view.state.selection.from - 2,
              view.state.selection.from
            )
          );
          
          // Insert a task list
          addTaskItem();
          return true;
        }
        
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Check if the current input contains '/' to show the menu
      const text = editor.getText();
      const selection = editor.state.selection;
      const currentPos = selection.anchor;
      
      // If we're at the start of a paragraph and typed '/', show the menu
      if (text.endsWith('/') && currentPos === 1) {
        const domPos = editor.view.coordsAtPos(currentPos);
        
        if (editorContainerRef.current) {
          const containerRect = editorContainerRef.current.getBoundingClientRect();
          
          setSlashMenuPosition({
            top: domPos.bottom - containerRect.top,
            left: domPos.left - containerRect.left,
          });
          
          setShowSlashMenu(true);
        }
      } else if (showSlashMenu && !text.includes('/')) {
        // Hide menu if we're no longer at a slash
        setShowSlashMenu(false);
      }
      
      // Trigger save with debounce when content changes
      handleContentChange(editor);
    },
  });

  // Save notes to database with debounce
  const saveNotes = useCallback(async (editorContent: any) => {
    if (!trip) return;
    
    // Set saving status
    setSaveStatus('saving');
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('trips')
        .update({ notes: editorContent })
        .eq('id', trip.id);

      if (error) throw error;
      
      // Update the trip in parent component
      onUpdate({ ...trip, notes: editorContent });
      
      // Update save status
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving notes:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  }, [trip, onUpdate, supabase]);

  // Debounce the save function
  const handleContentChange = useCallback((editor: Editor) => {
    // Clear any existing timeout
    const timeoutId = setTimeout(() => {
      const content = editor.getJSON();
      saveNotes(content);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [saveNotes]);

  // Format the last saved time and handle animation timing
  const formatLastSaved = (): string => {
    if (!lastSaved) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    // Only show "just now" for 3 seconds, then switch to minutes
    if (diffSec < 3) {
      return 'just now';
    } else if (diffMin < 1) {
      return `${diffSec} seconds ago`;
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    } else {
      const hours = lastSaved.getHours().toString().padStart(2, '0');
      const minutes = lastSaved.getMinutes().toString().padStart(2, '0');
      return `at ${hours}:${minutes}`;
    }
  };

  // Handle clicking outside the slash menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSlashMenu && editorContainerRef.current && !editorContainerRef.current.contains(event.target as Node)) {
        setShowSlashMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSlashMenu]);

  if (!editor) {
    return null;
  }

  // Helper function to add a task item
  const addTaskItem = () => {
    // First, create a paragraph if the editor is empty
    if (editor.isEmpty) {
      editor.commands.setContent('<p></p>');
    }
    
    // Then insert the task list at the current position
    editor.commands.insertContent({
      type: 'taskList',
      content: [{
        type: 'taskItem',
        attrs: { checked: false },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New task' }] }]
      }]
    });
    
    // Focus the editor after inserting
    editor.commands.focus();
  };

  // Toggle task item status
  const toggleTaskItem = () => {
    editor.chain().focus().toggleTaskList().run();
  };

  // Helper function to handle slash command actions
  const handleSlashCommand = (action: (editor: Editor) => void) => {
    // Delete the slash character at the current position
    if (editor.getText().endsWith('/')) {
      editor.commands.deleteRange({
        from: editor.state.selection.from - 1,
        to: editor.state.selection.from
      });
    }
    
    // Apply the action
    action(editor);
    
    // Hide the menu
    setShowSlashMenu(false);
  };

  // Define slash commands
  const slashCommands: SlashCommand[] = [
    {
      title: 'Heading 1',
      description: 'Large section heading',
      icon: 'H1',
      action: (editor) => {
        handleSlashCommand((ed) => ed.chain().focus().toggleHeading({ level: 1 }).run());
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: 'H2',
      action: (editor) => {
        handleSlashCommand((ed) => ed.chain().focus().toggleHeading({ level: 2 }).run());
      },
    },
    {
      title: 'Task List',
      description: 'Create a task list with checkboxes',
      icon: '☑',
      action: (editor) => {
        handleSlashCommand(() => addTaskItem());
      },
    },
    {
      title: 'Bullet List',
      description: 'Create a bulleted list',
      icon: '•',
      action: (editor) => {
        handleSlashCommand((ed) => ed.chain().focus().toggleBulletList().run());
      },
    },
    {
      title: 'Numbered List',
      description: 'Create a numbered list',
      icon: '1.',
      action: (editor) => {
        handleSlashCommand((ed) => ed.chain().focus().toggleOrderedList().run());
      },
    },
    {
      title: 'Blockquote',
      description: 'Add a quote block',
      icon: '"',
      action: (editor) => {
        handleSlashCommand((ed) => ed.chain().focus().toggleBlockquote().run());
      },
    },
    {
      title: 'Code Block',
      description: 'Add a code block',
      icon: '</>',
      action: (editor) => {
        handleSlashCommand((ed) => ed.chain().focus().toggleCodeBlock().run());
      },
    },
  ];

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
            <span className={`text-sm text-gray-500 ${formatLastSaved() === 'just now' ? styles.saveStatusJustNow : ''}`}>
              Saved {formatLastSaved()}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-500">
              Error saving
            </span>
          )}
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className={`border border-gray-200 rounded-lg mb-4 ${styles.toolbar}`}>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 1 }) ? styles.toolbarButtonActive : ''}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 2 }) ? styles.toolbarButtonActive : ''}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${styles.toolbarButton} ${editor.isActive('bold') ? styles.toolbarButtonActive : ''}`}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${styles.toolbarButton} ${editor.isActive('italic') ? styles.toolbarButtonActive : ''}`}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${styles.toolbarButton} ${editor.isActive('underline') ? styles.toolbarButtonActive : ''}`}
          title="Underline"
        >
          <u>U</u>
        </button>
        <button
          onClick={addTaskItem}
          className={`${styles.toolbarButton} ${editor.isActive('taskList') ? styles.toolbarButtonActive : ''}`}
          title="Task List"
        >
          ☑ Tasks
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${styles.toolbarButton} ${editor.isActive('bulletList') ? styles.toolbarButtonActive : ''}`}
          title="Bullet List"
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${styles.toolbarButton} ${editor.isActive('orderedList') ? styles.toolbarButtonActive : ''}`}
          title="Numbered List"
        >
          1. List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${styles.toolbarButton} ${editor.isActive('blockquote') ? styles.toolbarButtonActive : ''}`}
          title="Quote"
        >
          ""
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`${styles.toolbarButton} ${editor.isActive('code') ? styles.toolbarButtonActive : ''}`}
          title="Inline Code"
        >
          &lt;/&gt;
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`${styles.toolbarButton} ${editor.isActive('codeBlock') ? styles.toolbarButtonActive : ''}`}
          title="Code Block"
        >
          &lt;/&gt; Block
        </button>
      </div>

      {/* Editor content */}
      <div className={styles.editor} ref={editorContainerRef}>
        <EditorContent editor={editor} />
        
        {/* Slash command menu */}
        {showSlashMenu && (
          <div 
            className={styles.slashMenu}
            style={{ 
              top: slashMenuPosition.top, 
              left: slashMenuPosition.left + 8 // Add offset to account for the visible slash character
            }}
          >
            <div className={styles.slashMenuHeader}>
              BASIC BLOCKS
            </div>
            {slashCommands.map((command, index) => (
              <div 
                key={index}
                className={styles.slashMenuItem}
                onClick={() => command.action(editor)}
              >
                <div className={styles.slashMenuIcon}>
                  {command.icon}
                </div>
                <div>
                  <div className={styles.slashMenuTitle}>{command.title}</div>
                  <div className={styles.slashMenuDescription}>{command.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Type '/' for commands • Type '[]' for tasks • Click checkboxes to toggle • Content saves automatically</p>
      </div>
    </div>
  );
};

export default TripNotes;

/*
Future Migration Suggestion:

To support real-time collaboration or more granular block control, consider migrating from 
storing the entire document as a JSONB column to a structured blocks table:

1. Create a new `note_blocks` table with structure:
   - id: UUID (primary key)
   - trip_id: UUID (foreign key to trips table)
   - block_id: String (unique identifier for the block within the document)
   - type: String (paragraph, heading, list, etc.)
   - content: JSONB (the block's content)
   - position: Integer (for ordering blocks)
   - created_at: Timestamp
   - updated_at: Timestamp
   - created_by: UUID (user who created the block)
   - updated_by: UUID (user who last updated the block)

2. Implement a migration script to convert existing JSONB documents to individual blocks

3. Update the editor to:
   - Load blocks individually and reconstruct the document
   - Save changes at the block level
   - Subscribe to real-time updates using Supabase's realtime features
   - Handle conflict resolution for concurrent edits

4. Add version history by keeping track of block changes over time

This approach would enable:
- More efficient updates (only changed blocks are saved)
- Real-time collaboration with less conflict
- Block-level permissions
- Version history and change tracking
*/ 