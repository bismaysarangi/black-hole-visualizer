import { useNASAData } from "../hooks/useNASAData";

export default function CatalogPanel() {
  const {
    catalog,
    isLoading,
    error,
    loadBlackHole,
    formatMass,
    formatDistance,
  } = useNASAData();

  const typeColor = (type: string) => {
    if (type === "supermassive") return "var(--accent)";
    if (type === "ultramassive") return "var(--warning)";
    return "var(--success)";
  };

  return (
    <div style={{ padding: "16px", height: "100%", overflowY: "auto" }}>
      <div
        style={{
          color: "var(--text-muted)",
          fontSize: "10px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "14px",
          paddingBottom: "6px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        NASA Catalog
      </div>

      {isLoading && (
        <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
          Loading catalog...
        </div>
      )}

      {error && (
        <div
          style={{
            color: "var(--danger)",
            fontSize: "11px",
            padding: "10px",
            background: "rgba(239,68,68,0.08)",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(239,68,68,0.2)",
            marginBottom: "10px",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>
            Failed to load catalog
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>
            {error}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {catalog?.black_holes.map((bh) => (
          <button
            key={bh.slug}
            onClick={() => loadBlackHole(bh)}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "10px 12px",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-strong)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                {bh.name}
              </span>
              <span
                style={{
                  color: typeColor(bh.type),
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {bh.type}
              </span>
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "10px",
                marginBottom: "6px",
              }}
            >
              {bh.description}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              {[
                ["Mass", formatMass(bh.mass_solar)],
                ["Distance", formatDistance(bh.distance_ly)],
                ["Spin", bh.spin.toFixed(3)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div
                    style={{ color: "var(--text-disabled)", fontSize: "9px" }}
                  >
                    {k}
                  </div>
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
