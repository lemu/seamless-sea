import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@rafal.lemieszewski/tide-ui";

interface DealCelebrationProps {
  /** Seconds before auto-dismiss. Default: 6 */
  autoDismissAfter?: number;
}

const LAST_CELEBRATED_KEY = "seamless-sea:last-celebrated-activity-id";

export function DealCelebration({ autoDismissAfter = 6 }: DealCelebrationProps) {
  const [visible, setVisible] = useState(false);
  const [activityDescription, setActivityDescription] = useState<string>("");

  const latestActivity = useQuery(api.home.getLatestDealActivity);

  // Reactively trigger when a new fixed/on-subs activity appears
  useEffect(() => {
    if (!latestActivity) return;
    const lastId = localStorage.getItem(LAST_CELEBRATED_KEY);
    const activityId = String(latestActivity._id);
    if (activityId !== lastId) {
      localStorage.setItem(LAST_CELEBRATED_KEY, activityId);
      setActivityDescription(latestActivity.description ?? "Deal Fixed!");
      setVisible(true);
    }
  }, [latestActivity]);

  // Auto-dismiss
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), autoDismissAfter * 1000);
    return () => clearTimeout(timer);
  }, [visible, autoDismissAfter]);

  const handleDemoTrigger = useCallback(() => {
    setActivityDescription("🚨 Deal Fixed! 🧜 CP48231 — Iron Ore 75,000 mt from Tubarao to Qingdao 🔔⚓🌊");
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => setVisible(false), []);

  return (
    <>
      {/* Demo trigger button — bottom right corner, ghost/subtle */}
      <button
        onClick={handleDemoTrigger}
        aria-label="Trigger deal celebration demo"
        title="Trigger deal celebration (demo)"
        className="fixed bottom-6 right-6 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-brand-bold)] hover:border-[var(--color-border-brand)] transition-colors shadow-sm"
      >
        <span role="img" aria-hidden="true" className="text-lg">⚓</span>
      </button>

      {/* Celebration banner */}
      {visible && (
        <>
          <style>{`
            @keyframes celebration-slide-in {
              from { transform: translateY(-16px); opacity: 0; }
              to   { transform: translateY(0);     opacity: 1; }
            }

            @keyframes particle-float-1 {
              0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
              100% { transform: translate(-60px, 80px) rotate(180deg); opacity: 0; }
            }
            @keyframes particle-float-2 {
              0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
              100% { transform: translate(80px, 60px) rotate(-120deg); opacity: 0; }
            }
            @keyframes particle-float-3 {
              0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
              100% { transform: translate(40px, 100px) rotate(270deg); opacity: 0; }
            }
            @keyframes particle-float-4 {
              0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
              100% { transform: translate(-80px, 70px) rotate(-200deg); opacity: 0; }
            }
            @keyframes wave-ripple {
              0%, 100% { transform: scaleX(1); }
              50% { transform: scaleX(1.03); }
            }

            .celebration-banner {
              animation: celebration-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            .celebration-wave {
              animation: wave-ripple 2s ease-in-out infinite;
            }

            .particle-1 { animation: particle-float-1 ${autoDismissAfter}s ease-out forwards; }
            .particle-2 { animation: particle-float-2 ${autoDismissAfter}s ease-out 0.3s forwards; }
            .particle-3 { animation: particle-float-3 ${autoDismissAfter}s ease-out 0.6s forwards; }
            .particle-4 { animation: particle-float-4 ${autoDismissAfter}s ease-out 0.9s forwards; }

            @media (prefers-reduced-motion: reduce) {
              .celebration-banner,
              .celebration-wave,
              .particle-1, .particle-2, .particle-3, .particle-4 {
                animation: none !important;
              }
            }
          `}</style>

          <div
            role="status"
            aria-live="polite"
            className="celebration-banner rounded-xl overflow-hidden"
          >
            {/* Wave background */}
            <div
              className="celebration-wave absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #005f85 0%, #00374f 50%, #004764 100%)",
              }}
            />

            {/* Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <span className="particle-1 absolute text-white/30 text-2xl" style={{ left: "5%", top: "20%" }}>⚓</span>
              <span className="particle-2 absolute text-white/30 text-xl" style={{ left: "20%", top: "10%" }}>🌊</span>
              <span className="particle-3 absolute text-white/30 text-2xl" style={{ left: "35%", top: "25%" }}>🧜</span>
              <span className="particle-4 absolute text-white/25 text-lg" style={{ left: "50%", top: "15%" }}>🔔</span>
              <span className="particle-1 absolute text-white/25 text-xl" style={{ left: "62%", top: "20%" }}>🚨</span>
              <span className="particle-2 absolute text-white/30 text-2xl" style={{ left: "75%", top: "10%" }}>⚓</span>
              <span className="particle-3 absolute text-white/25 text-xl" style={{ left: "87%", top: "25%" }}>🌊</span>
              <span className="particle-4 absolute text-white/30 text-lg" style={{ left: "93%", top: "15%" }}>🔔</span>
            </div>

            {/* Content */}
            <div className="relative flex items-center justify-center gap-4 px-6 py-4">
              <p className="text-white font-semibold text-body-lg text-center">
                {activityDescription}
              </p>
              <Button
                variant="ghost"
                size="s"
                onClick={handleClose}
                aria-label="Dismiss celebration"
                className="text-white/80 hover:text-white hover:bg-white/10 shrink-0"
              >
                ✕
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
