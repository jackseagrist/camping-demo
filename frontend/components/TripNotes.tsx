import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Trip } from '../lib/types';
import { useEditor, EditorContent, Editor, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import OrderedList from '@tiptap/extension-ordered-list';
import { InputRule } from '@tiptap/core';
import styles from '../styles/TipTapEditor.module.css';
import posthog from '../posthog';

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

// Extension for handling Tab and Shift+Tab in task lists
const TaskItemKeymap = Extension.create({
  name: 'taskItemKeymap',
  
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // Check if we're in a task item
        if (editor.isActive('taskItem')) {
          // Try to indent the task item
          // First check if we're at the beginning of the task item
          const { selection } = editor.state;
          const { $from } = selection;
          
          // If we're at the beginning of a task item, sink it
          if ($from.parentOffset === 0) {
            return editor.commands.sinkListItem('taskItem');
          }
          
          // Otherwise, insert a tab character
          return false;
        }
        return false;
      },
      'Shift-Tab': ({ editor }) => {
        // Check if we're in a task item
        if (editor.isActive('taskItem')) {
          // Try to outdent the task item
          return editor.commands.liftListItem('taskItem');
        }
        return false;
      },
    };
  },
});

// Extension to prevent empty task items from stacking
const PreventEmptyTaskItems = Extension.create({
  name: 'preventEmptyTaskItems',
  
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // Only handle Enter in empty task items
        if (!editor.isActive('taskItem')) {
          return false;
        }
        
        // Check if the current task item is empty
        const { $head } = editor.state.selection;
        const node = $head.node();
        
        // If node has no content or only has an empty paragraph
        const isEmpty = node.content.size === 0 || 
            (node.content.childCount === 1 && 
             node.content.firstChild?.type.name === 'paragraph' && 
             node.content.firstChild.content.size === 0);
        
        if (isEmpty) {
          // Check if this is a nested task item
          const isNested = $head.node(-1).childCount > 1 || $head.depth > 3;
          
          if (isNested) {
            // If nested, just lift it out one level
            return editor.chain()
              .liftListItem('taskItem')
              .run();
          } else {
            // If this is the only task item in the list, convert to paragraph
            return editor.chain()
              .deleteNode('taskList')
              .insertContent('<p></p>')
              .run();
          }
        }
        
        return false;
      },
      // Handle Backspace key to prevent orphaned task items
      Backspace: ({ editor }) => {
        // Only handle Backspace in task items at the start of the item
        if (!editor.isActive('taskItem')) {
          return false;
        }
        
        const { selection } = editor.state;
        const { $from } = selection;
        
        // Only handle if we're at the beginning of the task item
        if ($from.parentOffset !== 0) {
          return false;
        }
        
        // Check if this is a nested task item
        const isNested = $from.node(-1).childCount > 1 || $from.depth > 3;
        
        if (isNested) {
          // If nested, lift it out one level
          return editor.chain()
            .liftListItem('taskItem')
            .run();
        }
        
        return false;
      }
    };
  },
});

// Custom extension for ordered lists with different styles based on nesting level
const NestedOrderedList = OrderedList.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'nested-ordered-list',
      },
    };
  },
});

// Extension to handle tab/shift+tab in ordered and bullet lists
const ListKeymap = Extension.create({
  name: 'listKeymap',
  
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // Check if we're in a list item
        if (editor.isActive('listItem')) {
          // Try to indent the list item
          return editor.commands.sinkListItem('listItem');
        }
        return false;
      },
      'Shift-Tab': ({ editor }) => {
        // Check if we're in a list item
        if (editor.isActive('listItem')) {
          // Try to outdent the list item
          return editor.commands.liftListItem('listItem');
        }
        return false;
      },
    };
  },
});

// Custom extension for task lists to handle nesting properly
const TaskListStructure = Extension.create({
  name: 'taskListStructure',

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('ul');
      dom.setAttribute('data-type', 'taskList');
      
      // Add proper class for styling
      dom.classList.add('task-list');
      
      // Set proper role for accessibility
      dom.setAttribute('role', 'list');
      
      return {
        dom,
        contentDOM: dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'taskList') {
            return false;
          }
          
          // Make sure the DOM element has the correct attributes
          dom.setAttribute('data-type', 'taskList');
          dom.classList.add('task-list');
          dom.setAttribute('role', 'list');
          
          return true;
        },
      };
    };
  },
});

// Custom extension for task items to handle nesting properly
const TaskItemView = Extension.create({
  name: 'taskItemView',

  addNodeView() {
    return ({ node, getPos, editor }) => {
      if (!editor.isEditable) {
        return {};
      }
      
      const dom = document.createElement('li');
      dom.setAttribute('data-type', 'taskItem');
      dom.setAttribute('data-checked', node.attrs.checked.toString());
      
      // Add proper class for styling
      dom.classList.add('task-item');
      
      // Create checkbox label
      const label = document.createElement('label');
      label.style.width = '1rem';
      label.style.height = '1rem';
      label.style.display = 'inline-flex';
      label.style.alignItems = 'center';
      label.style.justifyContent = 'center';
      
      // Create checkbox input
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = node.attrs.checked;
      checkbox.style.margin = '0';
      checkbox.style.width = '1rem';
      checkbox.style.height = '1rem';
      checkbox.style.minWidth = '1rem';
      checkbox.style.minHeight = '1rem';
      checkbox.style.boxSizing = 'border-box';
      checkbox.style.appearance = 'none';
      checkbox.style.webkitAppearance = 'none';
      checkbox.style.border = '1px solid #d1d5db';
      checkbox.style.borderRadius = '0.25rem';
      checkbox.style.backgroundColor = node.attrs.checked ? '#10b981' : 'white';
      checkbox.style.position = 'relative';
      
      // Add checkmark for checked state
      if (node.attrs.checked) {
        const checkmark = document.createElement('span');
        checkmark.style.position = 'absolute';
        checkmark.style.left = '50%';
        checkmark.style.top = '40%';
        checkmark.style.transform = 'translate(-50%, -50%) rotate(45deg)';
        checkmark.style.width = '0.3rem';
        checkmark.style.height = '0.5rem';
        checkmark.style.borderRight = '2px solid white';
        checkmark.style.borderBottom = '2px solid white';
        checkbox.appendChild(checkmark);
      }
      
      // Add event listener to toggle checkbox
      checkbox.addEventListener('change', (event) => {
        if (typeof getPos === 'function') {
          const position = getPos();
          const { tr } = editor.state;
          
          tr.setNodeMarkup(position, undefined, {
            ...node.attrs,
            checked: checkbox.checked,
          });
          
          editor.view.dispatch(tr);
        }
        
        // Prevent default to avoid form submission
        event.preventDefault();
      });
      
      // Append checkbox to label
      label.appendChild(checkbox);
      
      // Create content container
      const content = document.createElement('div');
      content.classList.add('task-content');
      content.style.marginLeft = '0.25rem'; // Add explicit spacing
      
      // Append label and content container to list item
      dom.appendChild(label);
      dom.appendChild(content);
      
      return {
        dom,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'taskItem') {
            return false;
          }
          
          // Update checked state
          if (updatedNode.attrs.checked !== checkbox.checked) {
            checkbox.checked = updatedNode.attrs.checked;
            dom.setAttribute('data-checked', updatedNode.attrs.checked.toString());
            
            // Update checkbox appearance
            checkbox.style.backgroundColor = updatedNode.attrs.checked ? '#10b981' : 'white';
            
            // Add or remove checkmark
            if (updatedNode.attrs.checked) {
              // Only add checkmark if it doesn't exist
              if (!checkbox.querySelector('span')) {
                const checkmark = document.createElement('span');
                checkmark.style.position = 'absolute';
                checkmark.style.left = '50%';
                checkmark.style.top = '40%';
                checkmark.style.transform = 'translate(-50%, -50%) rotate(45deg)';
                checkmark.style.width = '0.3rem';
                checkmark.style.height = '0.5rem';
                checkmark.style.borderRight = '2px solid white';
                checkmark.style.borderBottom = '2px solid white';
                checkbox.appendChild(checkmark);
              }
            } else {
              // Remove checkmark if it exists
              const checkmark = checkbox.querySelector('span');
              if (checkmark) {
                checkbox.removeChild(checkmark);
              }
            }
          }
          
          return true;
        },
      };
    };
  },
});

const TripNotes = ({ trip, onUpdate }: TripNotesProps) => {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<any>(null);

  // Initialize the editor with content from trip.notes
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable code and codeBlock from StarterKit
        code: false,
        codeBlock: false,
        // Replace the default OrderedList with our custom one
        orderedList: false,
      }),
      NestedOrderedList.configure({
        HTMLAttributes: {
          class: 'nested-ordered-list',
        },
      }),
      Underline,
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
      TaskItemKeymap,
      TaskListStructure,
      TaskItemView,
      ListKeymap,
      PreventEmptyTaskItems,
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
    
    // Check if content has actually changed
    if (JSON.stringify(editorContent) === JSON.stringify(lastContentRef.current)) {
      return;
    }
    
    // Update the reference to the current content
    lastContentRef.current = editorContent;
    
    // Set saving status
    setSaveStatus('saving');
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('trips')
        .update({ notes: editorContent })
        .eq('id', trip.id);

      if (error) throw error;
      
      // Track notes saved event
      posthog.capture('notes_saved', {
        trip_id: trip.id,
        content_length: JSON.stringify(editorContent).length,
        has_task_list: JSON.stringify(editorContent).includes('taskList')
      });
      
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
    // Track notes edited event
    posthog.capture('notes_edited', {
      trip_id: trip?.id
    });
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set a new timeout
    saveTimeoutRef.current = setTimeout(() => {
      const content = editor.getJSON();
      saveNotes(content);
    }, 500); // 500ms debounce
  }, [saveNotes, trip]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

  // Handle clicking outside the export menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu && exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

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
        content: [{ type: 'paragraph' }]
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
  ];

  // Convert editor content to plain text for export
  const getPlainTextContent = () => {
    if (!editor) return '';
    
    // Get the JSON content
    const content = editor.getJSON();
    
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
    
    if (content.content) {
      extractText(content.content);
    }
    
    return plainText.trim();
  };

  // Export notes to iPhone Notes app
  const exportToiPhoneNotes = () => {
    try {
      // Get the plain text content
      const plainText = getPlainTextContent();
      
      // Create a title for the note based on the trip title
      const noteTitle = `${trip.title} - Trip Notes`;
      
      // Create the URL with the notes-specific URL scheme
      const notesUrl = `notes://x-callback-url/create?text=${encodeURIComponent(plainText)}&name=${encodeURIComponent(noteTitle)}`;
      
      // Open the URL which will trigger the Notes app
      window.open(notesUrl);
      
      // Track the export event
      posthog.capture('notes_exported_to_iphone', {
        trip_id: trip.id,
        content_length: plainText.length
      });
    } catch (error) {
      console.error('Error exporting notes:', error);
    }
  };

  // Copy notes to clipboard
  const copyToClipboard = async () => {
    try {
      const plainText = getPlainTextContent();
      await navigator.clipboard.writeText(plainText);
      
      // Show success message
      setCopySuccess('Copied!');
      
      // Clear success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(null);
      }, 2000);
      
      // Track the copy event
      posthog.capture('notes_copied_to_clipboard', {
        trip_id: trip.id,
        content_length: plainText.length
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setCopySuccess('Failed to copy');
      
      setTimeout(() => {
        setCopySuccess(null);
      }, 2000);
    }
  };

  // Download notes as text file
  const downloadAsTextFile = () => {
    try {
      const plainText = getPlainTextContent();
      const fileName = `${trip.title.replace(/\s+/g, '-').toLowerCase()}-notes.txt`;
      
      // Create a blob with the text content
      const blob = new Blob([plainText], { type: 'text/plain' });
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Track the download event
      posthog.capture('notes_downloaded_as_text', {
        trip_id: trip.id,
        content_length: plainText.length
      });
    } catch (error) {
      console.error('Error downloading notes:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Trip Notes</h2>
        <div className="flex items-center space-x-2">
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-full flex items-center transition-colors"
              title="Export options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {copySuccess || 'Export'}
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      copyToClipboard();
                      setShowExportMenu(false);
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                      <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                    </svg>
                    Copy to clipboard
                  </button>
                  <button
                    onClick={() => {
                      downloadAsTextFile();
                      setShowExportMenu(false);
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download as text file
                  </button>
                  <button
                    onClick={() => {
                      exportToiPhoneNotes();
                      setShowExportMenu(false);
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 3a1 1 0 011-1h10a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" clipRule="evenodd" />
                    </svg>
                    Save to iPhone Notes
                  </button>
                </div>
              </div>
            )}
          </div>
          
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
          &ldquo; &ldquo;
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
        <p>Type &apos;/&apos; for commands • Type &apos;[]&apos; for tasks • Click checkboxes to toggle • Content saves automatically</p>
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