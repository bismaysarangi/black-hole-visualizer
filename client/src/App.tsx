import { useState } from "react";
import BlackHoleCanvas from "./components/BlackHoleCanvas";
import ControlPanel from "./components/ControlPanel";
import InfoOverlay from "./components/InfoOverlay";
import ShareModal from "./components/ShareModal";
import CatalogPanel from "./components/CatalogPanel";
import ProbeControls from "./components/ProbeControls";
import SpacecraftOverlay from "./components/SpacecraftOverlay";
import { useSimulationStore } from "./store/simulationStore";

type Tab = "controls" | "catalog" | "probe";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("controls");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading } = useSimulationStore();

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        backgroundImage: "linear-gradient(rgba(5, 5, 10, 0.55), rgba(5, 5, 10, 0.55)), url(/starmap.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        overflow: "hidden",
      }}
    >
      {/* ── Mobile Top Bar ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(17, 17, 17, 0.85)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
          zIndex: 50,
        }}
        className="mobile-topbar"
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              flexShrink: 0,
              background:
                "radial-gradient(circle, #000 40%, #1d4ed8 70%, transparent 100%)",
              boxShadow: "0 0 8px rgba(59,130,246,0.5)",
            }}
          />
          <div>
            <div
              style={{
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
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

        {/* Right side — live indicator + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: isLoading ? "var(--warning)" : "var(--accent)",
                boxShadow: isLoading
                  ? "0 0 5px var(--warning)"
                  : "0 0 5px var(--accent)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
              }}
            >
              {isLoading ? "COMPUTING" : "LIVE"}
            </span>
          </div>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="hamburger"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "5px 8px",
              cursor: "pointer",
              display: "none",
              flexDirection: "column",
              gap: "3px",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  width: "16px",
                  height: "1.5px",
                  background: "var(--text-secondary)",
                  transition: "all 0.2s ease",
                  transform: sidebarOpen
                    ? i === 0
                      ? "translateY(4.5px) rotate(45deg)"
                      : i === 2
                        ? "translateY(-4.5px) rotate(-45deg)"
                        : "scaleX(0)"
                    : "none",
                }}
              />
            ))}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ── Sidebar ────────────────────────────────────────────── */}
        <div
          className="sidebar"
          style={{
            width: "260px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "rgba(17, 17, 17, 0.82)",
            backdropFilter: "blur(16px)",
            borderRight: "1px solid var(--border)",
            flexShrink: 0,
            zIndex: 40,
          }}
        >
          {/* Desktop logo — hidden on mobile */}
          <div
            className="desktop-logo"
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background:
                    "radial-gradient(circle, #000 40%, #1d4ed8 70%, transparent 100%)",
                  boxShadow: "0 0 10px rgba(59,130,246,0.4)",
                  animation: "pulse 3s ease-in-out infinite",
                }}
              />
              <div>
                <div
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    fontWeight: 600,
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

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            {(["controls", "catalog", "probe"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSidebarOpen(true);
                }}
                style={{
                  flex: 1,
                  padding: "9px 0",
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
                {tab === "probe" ? "probe" : tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {activeTab === "controls" ? (
              <ControlPanel />
            ) : activeTab === "probe" ? (
              <ProbeControls />
            ) : (
              <CatalogPanel />
            )}
          </div>
        </div>

        {/* ── Mobile overlay backdrop ─────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="backdrop"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 35,
              display: "none",
            }}
          />
        )}

        {/* ── Canvas ─────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <BlackHoleCanvas />
          {activeTab === "probe" && <SpacecraftOverlay />}

          {/* Desktop breadcrumb — top left */}
          <div
            className="breadcrumb"
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
              zIndex: 5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {["simulation", "schwarzschild", "interactive"].map(
                (seg, i, arr) => (
                  <span
                    key={seg}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        color:
                          i === arr.length - 1
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        fontSize: "10px",
                        fontFamily:
                          i === arr.length - 1 ? "var(--font-mono)" : "inherit",
                        fontWeight: i === arr.length - 1 ? 500 : 400,
                      }}
                    >
                      {seg}
                    </span>
                    {i < arr.length - 1 && (
                      <span
                        style={{
                          color: "var(--border-strong)",
                          fontSize: "10px",
                        }}
                      >
                        /
                      </span>
                    )}
                  </span>
                ),
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

          <InfoOverlay />
        </div>
      </div>

      <ShareModal />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        /* ── Mobile breakpoint ── */
        @media (max-width: 768px) {

          .mobile-topbar {
            display: flex !important;
          }

          .hamburger {
            display: flex !important;
          }

          .desktop-logo {
            display: none !important;
          }

          .breadcrumb {
            display: none !important;
          }

          .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            height: 100dvh !important;
            transform: ${sidebarOpen ? "translateX(0)" : "translateX(-100%)"} !important;
            transition: transform 0.25s ease !important;
            z-index: 40 !important;
            width: 280px !important;
            padding-top: 52px !important;
          }

          .backdrop {
            display: block !important;
            top: 52px !important;
          }

          /* Push overlay above mobile browser chrome */
          .info-overlay {
            bottom: max(12px, env(safe-area-inset-bottom, 12px)) !important;
            left: 8px !important;
            right: 8px !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            justify-content: flex-end !important;
            align-items: flex-end !important;
            gap: 6px !important;
          }
        }

        /* ── Desktop ── */
        @media (min-width: 769px) {
          .mobile-topbar {
            display: none !important;
          }

          .hamburger {
            display: none !important;
          }

          .sidebar {
            position: relative !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
