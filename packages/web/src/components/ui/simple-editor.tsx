"use client"

import Blockquote from "@tiptap/extension-blockquote"
import Heading from "@tiptap/extension-heading"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import Link from "@tiptap/extension-link"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useCallback, useEffect, useRef, useState } from "react"
import { Markdown } from "tiptap-markdown"

interface SimpleEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function SimpleEditor({
  content,
  onChange,
  placeholder = "Write something...",
}: SimpleEditorProps) {
  // Force re-render on selection change to update toolbar button states
  const [, setSelectionUpdate] = useState(0)
  // Track if content change is from internal editing (to avoid loops)
  const isInternalChange = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable features we don't need - using explicit extensions instead
        heading: false,
        blockquote: false,
        horizontalRule: false,
        codeBlock: false,
        code: false,
        dropcursor: false,
        gapcursor: false,
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Blockquote,
      HorizontalRule,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    editorProps: {
      attributes: {
        class: "simple-editor-content",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      isInternalChange.current = true
      onChange(editor.getHTML())
    },
    onSelectionUpdate: () => {
      // Force re-render to update toolbar button active states
      setSelectionUpdate((prev) => prev + 1)
    },
  })

  // Sync external content changes to editor (e.g., from AI assistant)
  useEffect(() => {
    if (!editor) return

    // Skip if this was an internal change (user typing)
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }

    // Only update if content is different from current editor content
    const currentContent = editor.getHTML()
    if (content !== currentContent) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, content])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL", previousUrl)

    if (url === null) {
      return
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const pasteMarkdown = useCallback(async () => {
    if (!editor) return

    try {
      const clipboardText = await navigator.clipboard.readText()
      if (clipboardText) {
        // Use the markdown extension's storage to convert and insert
        // biome-ignore lint/suspicious/noExplicitAny: tiptap-markdown storage type not exported
        const markdownExtension = (editor.storage as any).markdown
        if (markdownExtension?.parser?.parse) {
          // Get the markdown parser from storage and insert content
          editor.commands.setContent(markdownExtension.parser.parse(clipboardText))
        } else {
          // Fallback: insert as plain text
          editor.commands.insertContent(clipboardText)
        }
      }
    } catch {
      // Clipboard API might not be available or permission denied
      const markdown = window.prompt("Paste your markdown content here:")
      if (markdown) {
        // biome-ignore lint/suspicious/noExplicitAny: tiptap-markdown storage type not exported
        const markdownExtension = (editor.storage as any).markdown
        if (markdownExtension?.parser?.parse) {
          editor.commands.setContent(markdownExtension.parser.parse(markdown))
        } else {
          editor.commands.insertContent(markdown)
        }
      }
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="simple-editor">
      <div className="simple-editor-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""}
          title="Heading 3"
        >
          H3
        </button>
        <span className="toolbar-divider" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
          title="Bold"
        >
          <i className="bx bx-bold" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
          title="Italic"
        >
          <i className="bx bx-italic" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "is-active" : ""}
          title="Strikethrough"
        >
          <i className="bx bx-strikethrough" />
        </button>
        <span className="toolbar-divider" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
          title="Bullet List"
        >
          <i className="bx bx-list-ul" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
          title="Numbered List"
        >
          <i className="bx bx-list-ol" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "is-active" : ""}
          title="Quote"
        >
          <i className="bx bxs-quote-left" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <i className="bx bx-minus" />
        </button>
        <span className="toolbar-divider" />
        <button
          type="button"
          onClick={setLink}
          className={editor.isActive("link") ? "is-active" : ""}
          title="Link"
        >
          <i className="bx bx-link" />
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remove Link"
          >
            <i className="bx bx-unlink" />
          </button>
        )}
        <span className="toolbar-divider" />
        <button type="button" onClick={pasteMarkdown} title="Paste markdown (replaces content)">
          <i className="bx bxl-markdown" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
