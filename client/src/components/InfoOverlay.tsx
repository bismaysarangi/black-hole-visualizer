import { useSimulationStore } from "../store/simulationStore";

export default function InfoOverlay() {
  const { config, analysis, isLoading } = useSimulationStore();
  if (!analysis) return null;

  const timeFactor = analysis.time_dilation.time_factor;
  const nearRate = (timeFactor * 100).toFixed(2);

  return (
    <>
      <style>{`
        .info-overlay {
          position: absolute;
          bottom: 12px;
          right: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          pointer-events: none;
          max-width: calc(100vw - 24px);
          z-index: 10;
        }

        @media (max-width: 768px) {
          .info-overlay {
            bottom: 8px;
            right: 8px;
            left: 8px;
            max-width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: flex-end;
            justify-content: flex-end;
          }
        }
      `}</style>

      <div className="info-overlay">
        {config.time_dilation && (
          <div
            style={{
              background: "rgba(10,10,10,0.88)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "8px 12px",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              Time Dilation
            </div>
            <div style={{ display: "flex", gap: "14px" }}>
              {[
                { label: "Near horizon", rate: nearRate, accent: true },
                { label: "Far observer", rate: "100.00", accent: false },
              ].map(({ label, rate, accent }) => (
                <div key={label}>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "9px",
                      marginBottom: "2px",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "14px",
                      color: accent ? "var(--accent)" : "var(--text-primary)",
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

        {/* Status pill */}
        <div
          style={{
            background: "rgba(10,10,10,0.88)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "6px 12px",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              flexShrink: 0,
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
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isLoading
              ? "computing geodesics..."
              : `M = ${config.mass.toFixed(1)} M☉  |  a = ${config.spin.toFixed(3)}`}
          </span>
        </div>
      </div>
    </>
  );
}
