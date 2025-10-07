"use client";

import React, { useMemo, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
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
}: RichTextEditorProps) {
  const processedContent = useMemo(() => {
    if (!preserveLineBreaks) {
      return content;
    }
    return toHtml(content);
  }, [content, preserveLineBreaks]);

  // Store onChange in a ref to avoid recreating editor on every parent re-render
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: processedContent,
    immediatelyRender: false, // Fix SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[120px] leading-relaxed',
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => {
      let value = editor.getHTML();
      if (preserveLineBreaks) {
        value = fromHtml(value);
      }
      if (!allowBold) {
        value = value.replace(/<\/?strong>/gi, "").replace(/<\/?b>/gi, "");
      }
      // Use ref to avoid recreation on every onChange change
      onChangeRef.current(value);
    },
  }, [allowBold, preserveLineBreaks, processedContent]);

  // Update editor content when external content changes (but not from typing)
  React.useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentContent = preserveLineBreaks ? fromHtml(editor.getHTML()) : editor.getHTML();
      if (currentContent !== content) {
        editor.commands.setContent(toHtml(content));
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
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

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

        <button
          type="button"
          onClick={addTable}
          className="px-3 py-1 rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 transition-colors"
        >
          + Table
        </button>
      </div>

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
    </div>
  );
}













