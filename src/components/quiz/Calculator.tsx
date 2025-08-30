"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";

export default function Calculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState("0");
  const [drag, setDrag] = useState({ x: 40, y: 120 });
  const box = useRef<HTMLDivElement | null>(null);

  function press(v: string) {
    setDisplay((d) => (d === "0" && /[0-9.]/.test(v) ? v : (d + v).replace(/^0(\d)/, "$1")));
  }
  function clear() { setDisplay("0"); }
  function equals() {
    try { const val = Function(`"use strict";return (${display})`)(); setDisplay(String(val)); }
    catch {}
  }

  function onMouseDown(e: React.MouseEvent) {
    const sx = e.clientX, sy = e.clientY;
    const start = { ...drag };
    function move(ev: MouseEvent) {
      setDrag({ x: start.x + (ev.clientX - sx), y: start.y + (ev.clientY - sy) });
    }
    function up() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    }
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  return (
    <div
      ref={box}
      className="fixed z-[60] w-64 rounded-md border border-[var(--border)] bg-[var(--surface)] shadow"
      style={{ left: drag.x, top: drag.y }}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--border)] cursor-move"
           onMouseDown={onMouseDown}>
        <div className="text-sm font-medium">Calculator</div>
        <button className="icon-btn" onClick={onClose}><X size={14} /></button>
      </div>
      <div className="px-2 py-3">
        <div className="mb-2 h-10 rounded border border-[var(--border)] flex items-center justify-end px-2 text-lg">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","C","+"].map(k => (
            <button key={k} onClick={() => (k==="C"?clear():press(k))}
              className="rounded border border-[var(--border)] py-2 hover:bg-[var(--primary-50)]">
              {k}
            </button>
          ))}
          <button className="col-span-4 rounded bg-[var(--primary)] text-white py-2 hover:bg-[var(--primary-600)]"
            onClick={equals}>=</button>
        </div>
      </div>
    </div>
  );
}
