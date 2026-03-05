import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { DESKS } from "../types/desk";
import { useDesk } from "../contexts/DeskContext";

export function DeskSelector() {
  const { deskIdx, setDeskIdx } = useDesk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const desk = DESKS[deskIdx];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: 12, left: 12, zIndex: 9999 }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderRadius: 20,
          border: "1px solid var(--color-border-primary-subtle)",
          background: "var(--color-bg-primary)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-text-primary)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
        aria-label={`Selected desk: ${desk.name}. Click to change.`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          style={{
            background: desk.color,
            color: "#fff",
            borderRadius: 4,
            padding: "1px 6px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.03em",
          }}
        >
          {desk.sigil}
        </span>
        <span>{desk.name}</span>
        <ChevronDown size={13} style={{ color: "var(--color-text-secondary)" }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select desk"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 200,
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-primary-subtle)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            overflow: "hidden",
          }}
        >
          {DESKS.map((d, i) => (
            <button
              key={d.sigil}
              role="option"
              aria-selected={i === deskIdx}
              onClick={() => { setDeskIdx(i); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 14px",
                background: i === deskIdx ? "var(--color-bg-secondary)" : "transparent",
                border: "none",
                borderBottom: i < DESKS.length - 1 ? "1px solid var(--color-border-primary-subtle)" : "none",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                color: "var(--color-text-primary)",
              }}
            >
              <span
                style={{
                  background: d.color,
                  color: "#fff",
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  flexShrink: 0,
                }}
              >
                {d.sigil}
              </span>
              <span style={{ flex: 1 }}>{d.name}</span>
              {i === deskIdx && (
                <Check size={13} style={{ color: d.color, flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
