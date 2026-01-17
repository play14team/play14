"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Heading from "@tiptap/extension-heading"
import Blockquote from "@tiptap/extension-blockquote"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import { useCallback } from "react"

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
      onChange(editor.getHTML())
    },
  })

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
        <span className="toolbar-divider"></span>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
          title="Bold"
        >
          <i className="bx bx-bold"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
          title="Italic"
        >
          <i className="bx bx-italic"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "is-active" : ""}
          title="Strikethrough"
        >
          <i className="bx bx-strikethrough"></i>
        </button>
        <span className="toolbar-divider"></span>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
          title="Bullet List"
        >
          <i className="bx bx-list-ul"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
          title="Numbered List"
        >
          <i className="bx bx-list-ol"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "is-active" : ""}
          title="Quote"
        >
          <i className="bx bxs-quote-left"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <i className="bx bx-minus"></i>
        </button>
        <span className="toolbar-divider"></span>
        <button
          type="button"
          onClick={setLink}
          className={editor.isActive("link") ? "is-active" : ""}
          title="Link"
        >
          <i className="bx bx-link"></i>
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remove Link"
          >
            <i className="bx bx-unlink"></i>
          </button>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
