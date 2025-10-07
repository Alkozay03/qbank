export type HLColor = "red" | "green" | "blue" | "yellow";

const COLOR_HEX: Record<HLColor, string> = {
  red:    "#e11d48",
  green:  "#16a34a",
  blue:   "#56A2CD",
  yellow: "#ffe066",
};

type InitParams = {
  roots: Array<HTMLElement | null>;
  getColor: () => HLColor | null; // return null to disable
};

/**
 * Stable highlighter:
 * - Listens on pointerup (after selection is finalized)
 * - Only highlights when selection is inside one of the allowed roots
 * - Color comes from getColor()
 * - Remove with Alt+Click on a highlight
 */
export function initHighlight({ roots, getColor }: InitParams) {
  const allowed = roots.filter((r): r is HTMLElement => !!r);

  const isInsideAllowed = (node: Node | null) => {
    while (node && node instanceof Element) {
      if (allowed.some((el) => el === node)) return true;
      node = node.parentElement;
    }
    return false;
  };

  const onPointerUp = () => {
    const color = getColor();
    if (!color) return;

    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    if (!isInsideAllowed(range.commonAncestorContainer)) return;

    // Wrap selection in a <mark>
    const mark = document.createElement("mark");
    mark.dataset.hl = color;
    mark.style.backgroundColor = COLOR_HEX[color];
    mark.style.padding = "0 2px";
    mark.style.borderRadius = "2px";

    try {
      const frag = range.extractContents();
      mark.appendChild(frag);
      range.insertNode(mark);
      sel.removeAllRanges();
    } catch {
      // Fallback for weird DOM ranges
      const txt = sel.toString();
      if (!txt) return;
      document.execCommand(
        "insertHTML",
        false,
        `<mark data-hl="${color}" style="background:${COLOR_HEX[color]};padding:0 2px;border-radius:2px;">${txt}</mark>`
      );
      sel.removeAllRanges();
    }
  };

  // Alt+Click a highlight to remove it
  const onAltClick = (ev: MouseEvent) => {
    if (!ev.altKey) return;
    let t = ev.target as HTMLElement | null;
    while (t && t !== document.body) {
      if (t.tagName === "MARK" && (t as HTMLElement).dataset.hl) {
        const parent = t.parentNode as Node;
        while (t.firstChild) parent.insertBefore(t.firstChild, t);
        parent.removeChild(t);
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      t = t.parentElement;
    }
  };

  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("click", onAltClick, true);

  // Cleanup so we don't leak listeners
  return () => {
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("click", onAltClick, true);
  };
}
