import { useSimulationStore } from "../store/simulationStore";

export default function InfoOverlay() {
  const { config, analysis, isLoading } = useSimulationStore();

  if (!analysis) return null;

  const timeFactor = analysis.time_dilation.time_factor;
  const nearRate = (timeFactor * 100).toFixed(2);
  const farRate = "100.00";

  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      {/* Time dilation clocks */}
      {config.time_dilation && (
        <div
          style={{
            background: "rgba(10,10,10,0.85)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "10px 14px",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Time Dilation
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { label: "Near horizon", rate: nearRate, dim: true },
              { label: "Far observer", rate: farRate, dim: false },
            ].map(({ label, rate, dim }) => (
              <div key={label}>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "9px",
                    marginBottom: "3px",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "16px",
                    color: dim ? "var(--accent)" : "var(--text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {rate}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div
        style={{
          background: "rgba(10,10,10,0.85)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "8px 14px",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: isLoading ? "var(--warning)" : "var(--accent)",
            boxShadow: isLoading
              ? "0 0 5px var(--warning)"
              : "0 0 5px var(--accent)",
          }}
        />
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {isLoading
            ? "computing geodesics..."
            : `M = ${config.mass.toFixed(1)} M☉  |  a = ${config.spin.toFixed(3)}`}
        </span>
      </div>
    </div>
  );
}
