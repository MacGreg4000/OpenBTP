'use client'

import * as React from 'react'
import { useRef, useEffect, useState } from 'react'
import { 
  BoldIcon, 
  ItalicIcon, 
  UnderlineIcon, 
  ListBulletIcon, 
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon
} from '@heroicons/react/24/outline'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Saisissez votre texte...",
  className = "",
  disabled = false
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const updateUndoRedoStates = () => {
    try {
      const canU = document.queryCommandEnabled('undo')
      const canR = document.queryCommandEnabled('redo')
      setCanUndo(!!canU)
      setCanRedo(!!canR)
    } catch {
      setCanUndo(false)
      setCanRedo(false)
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    updateContent()
    updateUndoRedoStates()
  }

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      execCommand('insertLineBreak')
    }
  }

  const handleInput = () => {
    updateContent()
    updateUndoRedoStates()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    // Nettoyer et encoder correctement le texte
    const cleanText = text
      .replace(/[\u00A0]/g, ' ') // Remplacer les espaces insécables
      .replace(/[\u2018\u2019]/g, "'") // Remplacer les guillemets courbes
      .replace(/[\u201C\u201D]/g, '"') // Remplacer les guillemets doubles
      .replace(/[\u2013\u2014]/g, '-') // Remplacer les tirets
    document.execCommand('insertText', false, cleanText)
  }

  const toggleFormat = (command: string) => {
    execCommand(command)
  }

  const insertList = (type: 'insertUnorderedList' | 'insertOrderedList') => {
    execCommand(type)
  }

  // alignement optionnel supprimé (non utilisé)

  const insertQuote = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const blockquote = document.createElement('blockquote')
      blockquote.style.borderLeft = '4px solid #e5e7eb'
      blockquote.style.paddingLeft = '1rem'
      blockquote.style.margin = '0.5rem 0'
      blockquote.style.fontStyle = 'italic'
      blockquote.style.color = '#6b7280'
      
      range.surroundContents(blockquote)
      updateContent()
    }
  }

  const undo = () => {
    document.execCommand('undo')
    updateContent()
  }

  const redo = () => {
    document.execCommand('redo')
    updateContent()
  }

  const ToolbarButton = ({ 
    onClick, 
    icon: Icon, 
    title, 
    active = false,
    disabled = false 
  }: {
    onClick: () => void
    icon: React.ComponentType<{ className?: string }>
    title: string
    active?: boolean
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-md transition-colors duration-200 ${
        active 
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={undo}
            icon={ArrowUturnLeftIcon}
            title="Annuler"
            disabled={!canUndo}
          />
          <ToolbarButton
            onClick={redo}
            icon={ArrowUturnRightIcon}
            title="Rétablir"
            disabled={!canRedo}
          />
        </div>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
        
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => toggleFormat('bold')}
            icon={BoldIcon}
            title="Gras"
          />
          <ToolbarButton
            onClick={() => toggleFormat('italic')}
            icon={ItalicIcon}
            title="Italique"
          />
          <ToolbarButton
            onClick={() => toggleFormat('underline')}
            icon={UnderlineIcon}
            title="Souligné"
          />
        </div>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
        
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => insertList('insertUnorderedList')}
            icon={ListBulletIcon}
            title="Liste à puces"
          />
          <ToolbarButton
            onClick={() => insertList('insertOrderedList')}
            icon={Bars3Icon}
            title="Liste numérotée"
          />
          <ToolbarButton
            onClick={insertQuote}
            icon={ChatBubbleLeftRightIcon}
            title="Citation"
          />
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        dir="ltr"
        className={`min-h-[200px] p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 
          'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
        }`}
        style={{ 
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          direction: 'ltr',
          unicodeBidi: 'isolate'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        [contenteditable] blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 0.5rem 0;
          font-style: italic;
          color: #6b7280;
        }
        
        [contenteditable] ul, [contenteditable] ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        [contenteditable] li {
          margin: 0.25rem 0;
        }
        
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        
        .rich-text-content {
          direction: ltr;
          unicode-bidi: normal;
        }
        
        .rich-text-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 0.5rem 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .rich-text-content ul, .rich-text-content ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .rich-text-content li {
          margin: 0.25rem 0;
        }
        
        .rich-text-content p {
          margin: 0.5rem 0;
        }
        
        .rich-text-content strong {
          font-weight: bold;
        }
        
        .rich-text-content em {
          font-style: italic;
        }
        
        .rich-text-content u {
          text-decoration: underline;
        }
        
        .rich-text-content[style*="text-align: center"] {
          text-align: center;
        }
        
        .rich-text-content[style*="text-align: right"] {
          text-align: right;
        }
        
        .rich-text-content[style*="text-align: left"] {
          text-align: left;
        }
      `}</style>
    </div>
  )
} 