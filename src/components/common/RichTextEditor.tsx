
"use client";

import type { Editor } from '@tiptap/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bold, Italic, List, ListOrdered, Link2, Redo, Undo, Palette, Highlighter, X } from 'lucide-react';
import React, { useCallback } from 'react';

interface MenuBarProps {
  editor: Editor | null;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const currentTextColor = editor.getAttributes('textStyle').color;
  const currentHighlightColor = editor.getAttributes('highlight')?.color;


  return (
    <div className="flex flex-wrap items-center gap-1 border border-input bg-transparent p-1 rounded-t-md">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
              size="sm"
            >
              <Bold className="h-4 w-4"/>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Bold</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
              size="sm"
            >
              <Italic className="h-4 w-4"/>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Italic</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Font Color */}
      <div className="flex items-center gap-0.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={() => (document.getElementById('fontColorPickerMenuBar') as HTMLInputElement)?.click()}
                variant="ghost"
                size="sm"
                className={editor.isActive('textStyle', { color: currentTextColor }) && currentTextColor ? 'bg-accent text-accent-foreground' : ''}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Font Color</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <input
          id="fontColorPickerMenuBar"
          type="color"
          className="h-5 w-5 cursor-pointer appearance-none border-none bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none"
          value={currentTextColor || '#000000'}
          onInput={(event: React.ChangeEvent<HTMLInputElement>) => editor.chain().focus().setColor(event.target.value).run()}
          aria-label="Font color picker"
        />
        {currentTextColor && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={() => editor.chain().focus().unsetColor().run()}
                  variant="ghost"
                  size="iconSm"
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Clear Font Color</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Highlight Color */}
      <div className="flex items-center gap-0.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
               <Button
                type="button"
                onClick={() => (document.getElementById('highlightColorPickerMenuBar') as HTMLInputElement)?.click()}
                variant="ghost"
                size="sm"
                className={editor.isActive('highlight', { color: currentHighlightColor }) && currentHighlightColor ? 'bg-accent text-accent-foreground' : ''}
              >
                <Highlighter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Highlight Color</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <input
          id="highlightColorPickerMenuBar"
          type="color"
          className="h-5 w-5 cursor-pointer appearance-none border-none bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none"
          value={currentHighlightColor || '#ffff00'}
          onInput={(event: React.ChangeEvent<HTMLInputElement>) => editor.chain().focus().setHighlight({ color: event.target.value }).run()}
          aria-label="Highlight color picker"
        />
        {currentHighlightColor && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  variant="ghost"
                  size="iconSm"
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Clear Highlight</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
              size="sm"
            >
              <List className="h-4 w-4"/>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Bullet List</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
              size="sm"
            >
              <ListOrdered className="h-4 w-4"/>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Ordered List</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={setLink}
              variant={editor.isActive('link') ? 'secondary' : 'ghost'}
              size="sm"
            >
              <Link2 className="h-4 w-4"/>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Set Link</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

       <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              variant="ghost"
              size="sm"
            >
              <Undo className="h-4 w-4"/>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Undo</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              variant="ghost"
              size="sm"
            >
              <Redo className="h-4 w-4"/>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Redo</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

interface RichTextEditorProps {
  value: string;
  onChange: (richText: string) => void;
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, disabled }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false, 
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextStyle, // Required for Color
      Color.configure({ types: ['textStyle'] }), // Allows color to be applied to textStyle
      Highlight.configure({ multicolor: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          'min-h-[150px] w-full rounded-b-md border-x border-b border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ProseMirror',
      },
    },
  });

  React.useEffect(() => {
    if (editor && editor.isEditable !== !disabled) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  React.useEffect(() => {
    // Only update content if it's truly different and editor is initialized
    // This helps prevent unnecessary re-renders or cursor jumps
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value, false); // false to avoid emitting update event
    }
  }, [value, editor]);


  return (
    <div className="flex flex-col">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
