import { useState } from "react";
import BlackHoleCanvas from "./components/BlackHoleCanvas";
import ControlPanel from "./components/ControlPanel";
import InfoOverlay from "./components/InfoOverlay";
import ShareModal from "./components/ShareModal";
import CatalogPanel from "./components/CatalogPanel";
import { useSimulationStore } from "./store/simulationStore";

type Tab = "controls" | "catalog";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("controls");
  const { isLoading } = useSimulationStore();

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        background: "var(--bg-base)",
        overflow: "hidden",
      }}
    >
      {/* ── Left Sidebar ─────────────────────────────────────────── */}
      <div
        style={{
          width: "260px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {/* Logo / Title */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {/* Animated black hole icon */}
            <div
              style={{
                position: "relative",
                width: "22px",
                height: "22px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, #000 40%, #1d4ed8 70%, transparent 100%)",
                  boxShadow: "0 0 10px rgba(59,130,246,0.4)",
                  animation: "pulse 3s ease-in-out infinite",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                }}
              >
                Black Hole Visualizer
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "9px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Relativistic Simulation
              </div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {(["controls", "catalog"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "8px 0",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                color:
                  activeTab === tab
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                fontSize: "10px",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "color 0.15s ease",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeTab === "controls" ? <ControlPanel /> : <CatalogPanel />}
        </div>
      </div>

      {/* ── Main Canvas Area ──────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Three.js canvas */}
        <BlackHoleCanvas />

        {/* Top bar — breadcrumb style */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.8), transparent)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
              simulation
            </span>
            <span style={{ color: "var(--border-strong)", fontSize: "10px" }}>
              /
            </span>
            <span style={{ color: "var(--text-secondary)", fontSize: "10px" }}>
              schwarzschild
            </span>
            <span style={{ color: "var(--border-strong)", fontSize: "10px" }}>
              /
            </span>
            <span
              style={{
                color: "var(--text-primary)",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
              }}
            >
              interactive
            </span>
          </div>

          {/* Live indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: isLoading ? "var(--warning)" : "var(--accent)",
                boxShadow: isLoading
                  ? "0 0 6px var(--warning)"
                  : "0 0 6px var(--accent)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
              }}
            >
              {isLoading ? "COMPUTING" : "LIVE"}
            </span>
          </div>
        </div>

        {/* Info overlay — bottom right */}
        <InfoOverlay />
      </div>

      {/* Share modal */}
      <ShareModal />

      {/* Global keyframe animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
