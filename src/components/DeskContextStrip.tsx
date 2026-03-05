import { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { DESKS } from "../types/desk";
import { useDesk } from "../contexts/DeskContext";

type Section = "supply" | "commodities" | "freight";

interface TooltipState {
  x: number;
  y: number;
  message: string;
}

const KEY_LABELS: Record<string, string> = {
  route: "Route",
  class: "Class",
  sector: "Sector",
  commodity: "Commodity",
};

export function DeskContextStrip({ section }: { section: Section }) {
  const { deskIdx, setDeskIdx } = useDesk();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const desk = DESKS[deskIdx];
  const locked = desk.lockedKeys[section];

  const handleLockedKeyClick = useCallback(
    (e: React.MouseEvent, key: string) => {
      if (section !== "freight") return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({
        x: rect.left,
        y: rect.bottom + 6,
        message: `Locked by desk: ${desk.name}. Switch desk to change.`,
      });
      setTimeout(() => setTooltip(null), 2000);
    },
    [desk.name, section]
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          marginBottom: 12,
          borderRadius: 6,
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border-primary-subtle)",
          fontSize: 12,
          lineHeight: "1.4",
          flexWrap: "wrap",
        }}
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
            flexShrink: 0,
          }}
        >
          {desk.sigil}
        </span>

        {locked.length === 0 ? (
          <span style={{ color: "var(--color-text-secondary)" }}>
            No desk filters applied to this section
          </span>
        ) : (
          <>
            <span style={{ color: "var(--color-text-secondary)" }}>
              Showing data for
            </span>
            {locked.map((key, i) => {
              const value = desk.filters[key as keyof typeof desk.filters];
              return (
                <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && (
                    <span style={{ color: "var(--color-text-tertiary)", margin: "0 2px" }}>·</span>
                  )}
                  <button
                    onClick={e => handleLockedKeyClick(e, key)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: section === "freight" ? "pointer" : "default",
                      fontSize: 12,
                      color: "#e6edf3",
                      fontWeight: 500,
                    }}
                    aria-label={
                      section === "freight"
                        ? `${KEY_LABELS[key] ?? key}: ${value}. Locked by desk.`
                        : undefined
                    }
                  >
                    <span style={{ color: "var(--color-text-tertiary)" }}>
                      {KEY_LABELS[key] ?? key}:
                    </span>{" "}
                    <span style={{ color: "#e6edf3", fontWeight: 500 }}>{value}</span>
                  </button>
                </span>
              );
            })}
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--color-text-brand-bold)",
                  padding: "0 4px",
                  fontWeight: 500,
                }}
              >
                Change desk
                <ChevronDown size={11} />
              </button>
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    minWidth: 190,
                    background: "var(--color-bg-primary)",
                    border: "1px solid var(--color-border-primary-subtle)",
                    borderRadius: 8,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                    overflow: "hidden",
                    zIndex: 200,
                  }}
                >
                  {DESKS.map((d, i) => (
                    <button
                      key={d.sigil}
                      onClick={() => { setDeskIdx(i); setDropdownOpen(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "8px 12px",
                        background: i === deskIdx ? "var(--color-bg-secondary)" : "transparent",
                        border: "none",
                        borderBottom: i < DESKS.length - 1 ? "1px solid var(--color-border-primary-subtle)" : "none",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 12,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      <span
                        style={{
                          background: d.color,
                          color: "#fff",
                          borderRadius: 4,
                          padding: "1px 5px",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.03em",
                        }}
                      >
                        {d.sigil}
                      </span>
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000,
            background: "var(--color-bg-inverse)",
            color: "var(--color-text-inverse)",
            padding: "5px 10px",
            borderRadius: 5,
            fontSize: 12,
            maxWidth: 280,
            pointerEvents: "none",
            animation: "gm-tooltip-fade 2s forwards",
          }}
        >
          {tooltip.message}
        </div>
      )}

      <style>{`
        @keyframes gm-tooltip-fade {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
