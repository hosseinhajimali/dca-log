import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

const TOOLTIP_W = 288; // w-72
const MARGIN = 8;

export function InfoTooltip({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function calcPos() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const top = rect.bottom + 8;
    // start left-aligned to the button, then clamp to viewport
    const rawLeft = rect.left;
    const left = Math.min(
      Math.max(rawLeft, MARGIN),
      window.innerWidth - TOOLTIP_W - MARGIN
    );
    setPos({ top, left });
  }

  function open_() {
    calcPos();
    setOpen(true);
  }

  // close on outside click / tap
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div className="flex items-center">
      <button
        ref={btnRef}
        onMouseEnter={open_}
        onMouseLeave={() => setOpen(false)}
        onClick={() => (open ? setOpen(false) : open_())}
        className="text-gray-600 hover:text-gray-400 transition-colors mt-0.5"
        aria-label="More info"
      >
        <Info size={16} />
      </button>

      {open && createPortal(
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: TOOLTIP_W }}
          className="max-w-[calc(100vw-1rem)] bg-gray-900 border border-gray-700 rounded-xl shadow-xl px-4 py-3 text-xs text-gray-400 leading-relaxed z-[9999]"
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}
