import { useSimulationStore } from "../store/simulationStore";
import { useEffect, useRef, useState } from "react";

export default function ShareModal() {
  const { showShareModal, shareUrl, setShowShareModal } = useSimulationStore();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showShareModal) setCopied(false);
  }, [showShareModal]);

  if (!showShareModal || !shareUrl) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => setShowShareModal(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          width: "400px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              color: "var(--text-primary)",
              fontWeight: 500,
              marginBottom: "4px",
            }}
          >
            Share Simulation
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            Anyone with this link sees your exact configuration.
          </div>
        </div>

        {/* URL input */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <input
            ref={inputRef}
            readOnly
            value={shareUrl}
            style={{
              flex: 1,
              padding: "8px 10px",
              background: "var(--bg-base)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              outline: "none",
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              padding: "8px 14px",
              background: copied ? "var(--success)" : "var(--accent)",
              border: "none",
              borderRadius: "var(--radius)",
              color: "#fff",
              fontSize: "11px",
              cursor: "pointer",
              fontWeight: 500,
              transition: "background 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Close */}
        <button
          onClick={() => setShowShareModal(false)}
          style={{
            width: "100%",
            padding: "8px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text-muted)",
            fontSize: "11px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
