"use client";

import React, { useMemo, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import type { Editor } from "@tiptap/core";

interface RichTextEditorProps {
  content: string;
  onChange: (_value: string) => void;
  placeholder?: string;
  className?: string;
  allowBold?: boolean;
  preserveLineBreaks?: boolean;
  hideImageButtons?: boolean;
  hideTableButton?: boolean;
  showUnderline?: boolean;
  showTextAlign?: boolean;
}

const HTML_DETECTION_REGEX = /<\/?[a-z][\s\S]*>/i;
const BULLET_MARKER_REGEX = /^([\u2022\-\*\+])\s+(.*)$/;
const ORDERED_MARKER_REGEX = /^(\d+)(?:[.)])\s+(.*)$/;

function isLikelyHtml(input: string): boolean {
  return HTML_DETECTION_REGEX.test(input);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function convertPlainTextToHtml(content: string): string {
  const normalised = content.replace(/\r\n?/g, "\n");
  const lines = normalised.split("\n");
  const html: string[] = [];

  let currentParagraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let orderedStart = 1;

  const flushParagraph = () => {
    if (!currentParagraph.length) return;
    const paragraphHtml = currentParagraph
      .map((line) => (line.length ? escapeHtml(line) : "&nbsp;"))
      .join("<br />");
    html.push(`<p>${paragraphHtml}</p>`);
    currentParagraph = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      orderedStart = 1;
      return;
    }

    const items = listItems.map((item) => `<li>${item}</li>`).join("");
    if (listType === "ol" && orderedStart !== 1) {
      html.push(`<ol start="${orderedStart}">${items}</ol>`);
    } else {
      html.push(`<${listType}>${items}</${listType}>`);
    }

    listType = null;
    listItems = [];
    orderedStart = 1;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const bulletMatch = trimmed.match(BULLET_MARKER_REGEX);
    const orderedMatch = trimmed.match(ORDERED_MARKER_REGEX);

    if (!trimmed) {
      flushParagraph();
      flushList();
      html.push("<p>&nbsp;</p>");
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(escapeHtml(bulletMatch[2].trim()));
      continue;
    }

    if (orderedMatch) {
      flushParagraph();
      const startValue = parseInt(orderedMatch[1], 10);
      if (listType !== "ol") {
        flushList();
        listType = "ol";
        orderedStart = Number.isNaN(startValue) ? 1 : startValue;
      }
      listItems.push(escapeHtml(orderedMatch[2].trim()));
      continue;
    }

    flushList();
    currentParagraph.push(rawLine.replace(/\s+$/g, ""));
  }

  flushParagraph();
  flushList();

  return html.join("");
}

function toHtml(content: string): string {
  if (!content) return "";
  if (isLikelyHtml(content)) return content;
  return convertPlainTextToHtml(content);
}

function collapseWhitespace(value: string): string {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getTextContent(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeName === "BR") {
    return "\n";
  }
  return Array.from(node.childNodes)
    .map((child) => getTextContent(child))
    .join("");
}

function fallbackFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<ul[^>]*>/gi, "\n")
    .replace(/<ol[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fromHtml(html: string): string {
  if (!html) return "";

  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return fallbackFromHtml(html);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const lines: string[] = [];

    const pushLine = (value: string) => {
      if (!value) {
        if (lines.length === 0 || lines[lines.length - 1] === "") return;
        lines.push("");
        return;
      }
      lines.push(value);
    };

    const handleList = (element: Element, ordered: boolean) => {
      const startAttr = ordered ? parseInt(element.getAttribute("start") ?? "1", 10) : 1;
      let index = Number.isNaN(startAttr) ? 1 : startAttr;

      Array.from(element.children).forEach((child) => {
        if (child.tagName !== "LI") return;
        const li = child as HTMLElement;
        const nestedLists: Element[] = [];
        const textParts: string[] = [];

        li.childNodes.forEach((node) => {
          if (node.nodeName === "UL" || node.nodeName === "OL") {
            nestedLists.push(node as Element);
            return;
          }
          textParts.push(getTextContent(node));
        });

        const mainText = collapseWhitespace(textParts.join(""));
        if (mainText) {
          pushLine(ordered ? `${index}. ${mainText}` : `${mainText}`);
        }
        nestedLists.forEach((nested) => handleList(nested, nested.tagName === "OL"));
        index += 1;
      });

      pushLine("");
    };

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = collapseWhitespace(node.textContent ?? "");
        if (text) pushLine(text);
        return;
      }

      if (node.nodeName === "BR") {
        pushLine("");
        return;
      }

      if (!(node instanceof Element)) {
        return;
      }

      const tag = node.tagName;

      if (tag === "UL" || tag === "OL") {
        handleList(node, tag === "OL");
        return;
      }

      if (tag === "P" || tag === "DIV") {
        const text = collapseWhitespace(getTextContent(node));
        if (text) {
          pushLine(text);
        }
        pushLine("");
        return;
      }

      if (tag === "LI") {
        const text = collapseWhitespace(getTextContent(node));
        if (text) {
          pushLine(`${text}`);
          pushLine("");
        }
        return;
      }

      Array.from(node.childNodes).forEach(processNode);
    };

    Array.from(doc.body.childNodes).forEach(processNode);

    while (lines.length && lines[lines.length - 1] === "") {
      lines.pop();
    }

    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return fallbackFromHtml(html);
  }
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
  className = "",
  allowBold = true,
  preserveLineBreaks = true,
  hideImageButtons = false,
  hideTableButton = false,
  showUnderline = false,
  showTextAlign = false,
}: RichTextEditorProps) {
  // Table modal state
  const [showTableModal, setShowTableModal] = React.useState(false);
  const [tableRows, setTableRows] = React.useState("3");
  const [tableCols, setTableCols] = React.useState("3");
  const [isTableActive, setIsTableActive] = React.useState(false);

  // Store content in a ref to avoid recreating editor
  const initialContentRef = React.useRef(content);
  const processedContent = useMemo(() => {
    if (!preserveLineBreaks) {
      return initialContentRef.current;
    }
    return toHtml(initialContentRef.current);
  }, [preserveLineBreaks]);

  // Store onChange and other props in refs to avoid recreating editor
  const onChangeRef = React.useRef(onChange);
  const allowBoldRef = React.useRef(allowBold);
  const preserveLineBreaksRef = React.useRef(preserveLineBreaks);
  
  React.useEffect(() => {
    onChangeRef.current = onChange;
    allowBoldRef.current = allowBold;
    preserveLineBreaksRef.current = preserveLineBreaks;
  }, [onChange, allowBold, preserveLineBreaks]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: allowBold ? {} : false,
        paragraph: {
          HTMLAttributes: { class: "prose-paragraph" },
        },
        hardBreak: {
          keepMarks: false,
          HTMLAttributes: { class: "prose-hard-break" },
        },
      }),
      ...(showUnderline ? [Underline] : []),
      ...(showTextAlign ? [TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      })] : []),
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: processedContent,
    immediatelyRender: false, // Fix SSR hydration mismatch
    shouldRerenderOnTransaction: false, // Prevent unnecessary re-renders
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[120px] leading-relaxed',
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => {
      let value = editor.getHTML();
      if (preserveLineBreaksRef.current) {
        value = fromHtml(value);
      }
      if (!allowBoldRef.current) {
        value = value.replace(/<\/?strong>/gi, "").replace(/<\/?b>/gi, "");
      }
      onChangeRef.current(value);
      
      // Update table active state
      setIsTableActive(editor.isActive("table"));
    },
    onSelectionUpdate: ({ editor }: { editor: Editor }) => {
      // Update table active state when selection changes
      setIsTableActive(editor.isActive("table"));
    },
  });

  // Update editor content when external content changes (but not from typing)
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    
    if (!editor.isFocused) {
      const currentContent = preserveLineBreaks ? fromHtml(editor.getHTML()) : editor.getHTML();
      const newContent = preserveLineBreaks ? toHtml(content) : content;
      
      if (currentContent !== content) {
        editor.commands.setContent(newContent, { emitUpdate: false });
      }
    }
  }, [editor, content, preserveLineBreaks]);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      return null;
    }
  }, []);

  const addImage = useCallback(() => {
    const url = window.prompt("Enter the URL of the image:");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addImageFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = await uploadImage(file);
        if (url) {
          editor?.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  }, [editor, uploadImage]);

  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const url = await uploadImage(file);
          if (url) {
            editor?.chain().focus().setImage({ src: url }).run();
          }
        }
        break;
      }
    }
  }, [editor, uploadImage]);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    for (const file of imageFiles) {
      const url = await uploadImage(file);
      if (url) {
        editor?.chain().focus().setImage({ src: url }).run();
      }
    }
  }, [editor, uploadImage]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const addTable = useCallback(() => {
    setShowTableModal(true);
  }, []);

  const insertTableWithDimensions = useCallback(() => {
    const rows = parseInt(tableRows, 10);
    const cols = parseInt(tableCols, 10);
    
    if (isNaN(rows) || isNaN(cols) || rows < 1 || rows > 20 || cols < 1 || cols > 10) {
      alert("Invalid input. Rows must be 1-20 and columns must be 1-10.");
      return;
    }
    
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTableModal(false);
    setTableRows("3");
    setTableCols("3");
  }, [editor, tableRows, tableCols]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      <div className="flex flex-wrap gap-2 p-3 border-b border-border bg-muted">
        {allowBold && (
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              editor.isActive("bold")
                ? "bg-primary text-inverse"
                : "bg-theme-background text-readable hover:bg-hover"
            }`}
          >
            Bold
          </button>
        )}

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive("italic")
              ? "bg-primary text-inverse"
              : "bg-theme-background text-readable hover:bg-hover"
          }`}
        >
          Italic
        </button>

        {showUnderline && (
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run()}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              editor.isActive("underline")
                ? "bg-primary text-inverse"
                : "bg-theme-background text-readable hover:bg-hover"
            }`}
          >
            Underline
          </button>
        )}

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive("bulletList")
              ? "bg-primary text-inverse"
              : "bg-theme-background text-readable hover:bg-hover"
          }`}
        >
          Bullets
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive("orderedList")
              ? "bg-primary text-inverse"
              : "bg-theme-background text-readable hover:bg-hover"
          }`}
        >
          1. Numbers
        </button>

        {showTextAlign && (
          <>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                editor.isActive({ textAlign: 'left' })
                  ? "bg-primary text-inverse"
                  : "bg-theme-background text-readable hover:bg-hover"
              }`}
              title="Align Left"
            >
              ⬅️
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                editor.isActive({ textAlign: 'center' })
                  ? "bg-primary text-inverse"
                  : "bg-theme-background text-readable hover:bg-hover"
              }`}
              title="Align Center"
            >
              ↔️
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                editor.isActive({ textAlign: 'right' })
                  ? "bg-primary text-inverse"
                  : "bg-theme-background text-readable hover:bg-hover"
              }`}
              title="Align Right"
            >
              ➡️
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                editor.isActive({ textAlign: 'justify' })
                  ? "bg-primary text-inverse"
                  : "bg-theme-background text-readable hover:bg-hover"
              }`}
              title="Justify"
            >
              ↔️↔️
            </button>
          </>
        )}

        {!hideImageButtons && (
          <>
            <button
              type="button"
              onClick={addImage}
              className="px-3 py-1 rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 transition-colors"
            >
              + URL Image
            </button>

            <button
              type="button"
              onClick={addImageFile}
              className="px-3 py-1 rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 transition-colors"
            >
              📁 Upload Image
            </button>
          </>
        )}

        {!hideTableButton && (
          <button
            type="button"
            onClick={addTable}
            className="px-3 py-1 rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 transition-colors"
          >
            + Table
          </button>
        )}
      </div>

      {/* Table controls - show when cursor is in a table */}
      {isTableActive && editor && (
        <div className="flex gap-2 p-2 border-b border-border bg-gray-50 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="px-2 py-1 rounded text-xs font-medium bg-white text-gray-700 hover:bg-gray-100 transition-colors"
            title="Add Column Before"
          >
            ← Column
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-2 py-1 rounded text-xs font-medium bg-white text-gray-700 hover:bg-gray-100 transition-colors"
            title="Add Column After"
          >
            Column →
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-2 py-1 rounded text-xs font-medium bg-white text-red-600 hover:bg-red-50 transition-colors"
            title="Delete Column"
          >
            ✕ Column
          </button>
          <div className="w-px bg-gray-300" />
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="px-2 py-1 rounded text-xs font-medium bg-white text-gray-700 hover:bg-gray-100 transition-colors"
            title="Add Row Before"
          >
            ↑ Row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-2 py-1 rounded text-xs font-medium bg-white text-gray-700 hover:bg-gray-100 transition-colors"
            title="Add Row After"
          >
            Row ↓
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-2 py-1 rounded text-xs font-medium bg-white text-red-600 hover:bg-red-50 transition-colors"
            title="Delete Row"
          >
            ✕ Row
          </button>
          <div className="w-px bg-gray-300" />
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="px-2 py-1 rounded text-xs font-medium bg-white text-red-600 hover:bg-red-50 transition-colors"
            title="Delete Entire Table"
          >
            🗑️ Table
          </button>
        </div>
      )}

      <div 
        className="p-4"
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          wordWrap: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "pre-wrap"
        }}
      >
        <EditorContent
          editor={editor}
          placeholder={placeholder}
        />
      </div>

      {/* Table Dimension Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowTableModal(false)}>
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Insert Table</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Rows (1-20)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Columns (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={insertTableWithDimensions}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTableModal(false);
                  setTableRows("3");
                  setTableCols("3");
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













