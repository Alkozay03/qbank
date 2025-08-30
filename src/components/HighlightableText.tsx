"use client";
import React from "react";

/** Simple text highlighter:
 * - Drag to select text → instantly highlights (yellow)
 * - Click a highlighted segment → removes that highlight
 * - Works on plain text (no HTML inside)
 */
type Range = { start: number; end: number };

function mergeRanges(ranges: Range[]) {
  if (!ranges.length) return ranges;
  const out: Range[] = [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let cur = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i];
    if (r.start <= cur.end) cur.end = Math.max(cur.end, r.end);
    else {
      out.push(cur);
      cur = { ...r };
    }
  }
  out.push(cur);
  return out;
}

function walkTextNodes(root: Node, cb: (n: Text) => void) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null = w.nextNode();
  while (n) {
    cb(n as Text);
    n = w.nextNode();
  }
}

function getGlobalOffsets(root: HTMLElement, sel: Selection) {
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }
  let acc = 0;
  let start = -1;
  let end = -1;

  walkTextNodes(root, (t) => {
    const len = t.nodeValue?.length ?? 0;
    if (t === range.startContainer) start = acc + range.startOffset;
    if (t === range.endContainer) end = acc + range.endOffset;
    acc += len;
  });

  if (start === -1 || end === -1) return null;
  if (end < start) [start, end] = [end, start];
  if (start === end) return null;
  return { start, end };
}

export default function HighlightableText({ text }: { text: string }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [ranges, setRanges] = React.useState<Range[]>([]);

  const onMouseUp = () => {
    const root = ref.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel) return;
    const off = getGlobalOffsets(root, sel);
    if (!off) return;
    sel.removeAllRanges();
    setRanges((prev) => mergeRanges([...prev, off]));
  };

  const removeRangeAt = (idx: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== idx));
  };

  // Build segments
  const pieces: Array<{ text: string; highlighted?: boolean; idx?: number }> = [];
  const sorted = mergeRanges(ranges);
  let cursor = 0;
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (cursor < r.start) pieces.push({ text: text.slice(cursor, r.start) });
    pieces.push({ text: text.slice(r.start, r.end), highlighted: true, idx: i });
    cursor = r.end;
  }
  if (cursor < text.length) pieces.push({ text: text.slice(cursor) });

  return (
    <div
      ref={ref}
      onMouseUp={onMouseUp}
      className="whitespace-pre-wrap leading-relaxed select-text"
      style={{ cursor: "text" }}
    >
      {pieces.map((p, i) =>
        p.highlighted ? (
          <mark
            key={i}
            onClick={() => removeRangeAt(p.idx!)}
            className="bg-yellow-200 hover:bg-yellow-300 cursor-pointer"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </div>
  );
}
