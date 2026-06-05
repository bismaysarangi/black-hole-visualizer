import { useSimulationStore } from "../store/simulationStore";

// ── Slider ────────────────────────────────────────────────────────────────────
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  display?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, unit, display, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: "2px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            color: "var(--text-secondary)",
            fontSize: "11px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
          }}
        >
          {display ?? value}
          {unit ?? ""}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: "2px",
          background: "var(--border-strong)",
          borderRadius: "1px",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: "var(--accent)",
            borderRadius: "1px",
            transition: "width 0.1s ease",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute",
            inset: "-6px 0",
            width: "100%",
            opacity: 0,
            cursor: "pointer",
            height: "14px",
          }}
        />
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          color: "var(--text-muted)",
          fontSize: "10px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "12px",
          paddingBottom: "6px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {children}
      </div>
    </div>
  );
}

// ── Angle Indicator ───────────────────────────────────────────────────────────
function AngleIndicator({ angle }: { angle: number }) {
  const size = 64;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 22;

  // Convert: 0°=radial-in, 90°=tangential, 180°=radial-out
  // Display as arrow from center
  const rad = (angle * Math.PI) / 180;
  const arrowLen = 18;
  // In our convention, the black hole is to the left,
  // so radial-in (0°) points left, tangential (90°) points up
  const ax = cx - arrowLen * Math.cos(rad);
  const ay = cy - arrowLen * Math.sin(rad);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "4px",
        marginBottom: "4px",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ opacity: 0.8 }}
      >
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Black hole dot (left side) */}
        <circle cx={cx - radius - 6} cy={cy} r="3" fill="var(--text-muted)" />

        {/* Radial direction line (dashed) */}
        <line
          x1={cx}
          y1={cy}
          x2={cx - radius}
          y2={cy}
          stroke="var(--border-strong)"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />

        {/* Velocity arrow */}
        <line
          x1={cx}
          y1={cy}
          x2={ax}
          y2={ay}
          stroke="#00e5ff"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Arrowhead */}
        <circle cx={ax} cy={ay} r="2.5" fill="#00e5ff" />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="2" fill="var(--text-primary)" />

        {/* Labels */}
        <text
          x={cx}
          y={size - 2}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="7"
          fontFamily="var(--font-mono)"
        >
          {angle}° velocity
        </text>
      </svg>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProbeControls() {
  const {
    probeConfig,
    probeActive,
    probeClassification,
    setProbeConfig,
    setProbeActive,
    resetProbe,
  } = useSimulationStore();

  const handleLaunch = () => {
    resetProbe();
    // Small delay so reset state propagates before activating
    setTimeout(() => {
      setProbeActive(true);
    }, 50);
  };

  const handleReset = () => {
    resetProbe();
  };

  const classificationColor = (() => {
    switch (probeClassification) {
      case "capture": return "var(--danger)";
      case "escape": return "var(--success)";
      case "stable_orbit": return "var(--accent)";
      default: return "var(--text-muted)";
    }
  })();

  const classificationLabel = (() => {
    switch (probeClassification) {
      case "capture": return "⚠ CAPTURED";
      case "escape": return "↗ ESCAPED";
      case "stable_orbit": return "⟳ STABLE ORBIT";
      case "pending": return "⏳ SIMULATING...";
      default: return "READY";
    }
  })();

  return (
    <div
      style={{
        width: "260px",
        height: "100%",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "2px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: probeActive ? "var(--accent)" : "var(--text-muted)",
                boxShadow: probeActive
                  ? "0 0 6px var(--accent)"
                  : "none",
                transition: "all 0.3s ease",
              }}
            />
            <span
              style={{
                color: "var(--text-primary)",
                fontWeight: 500,
                fontSize: "13px",
              }}
            >
              Spacecraft Probe
            </span>
          </div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "10px",
              paddingLeft: "14px",
            }}
          >
            Schwarzschild geodesic trajectory
          </div>
        </div>
      </div>

      {/* Scrollable controls */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <Section title="Launch Parameters">
          <Slider
            label="Start Radius"
            value={probeConfig.startR}
            min={2}
            max={30}
            step={0.5}
            display={probeConfig.startR.toFixed(1)}
            unit=" Rs"
            onChange={(v) => setProbeConfig({ startR: v })}
          />
          <Slider
            label="Velocity Angle"
            value={probeConfig.angle}
            min={0}
            max={180}
            step={1}
            display={probeConfig.angle.toFixed(0)}
            unit="°"
            onChange={(v) => setProbeConfig({ angle: v })}
          />
          <AngleIndicator angle={probeConfig.angle} />
          <Slider
            label="Speed"
            value={probeConfig.speed}
            min={0.01}
            max={0.5}
            step={0.005}
            display={probeConfig.speed.toFixed(3)}
            unit="c"
            onChange={(v) => setProbeConfig({ speed: v })}
          />
        </Section>

        <Section title="Classification">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: classificationColor,
                boxShadow: probeClassification && probeClassification !== "pending"
                  ? `0 0 8px ${classificationColor}`
                  : "none",
                transition: "all 0.3s ease",
                animation: probeClassification === "pending"
                  ? "pulse 1.5s ease-in-out infinite"
                  : "none",
              }}
            />
            <span
              style={{
                color: classificationColor,
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              {classificationLabel}
            </span>
          </div>

          {/* Quick-reference legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
            {[
              { label: "0° = radial inward", color: "var(--text-muted)" },
              { label: "90° = tangential orbit", color: "var(--text-muted)" },
              { label: "180° = radial outward", color: "var(--text-muted)" },
            ].map(({ label, color }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ color, fontSize: "9px", fontFamily: "var(--font-mono)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Reference rings legend */}
        <Section title="Reference Rings">
          {[
            { label: "Event Horizon (1 Rs)", color: "rgba(239, 68, 68, 0.7)" },
            { label: "Photon Sphere (1.5 Rs)", color: "rgba(245, 158, 11, 0.7)" },
            { label: "ISCO (3 Rs)", color: "rgba(6, 182, 212, 0.7)" },
          ].map(({ label, color }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "2px",
                  background: color,
                  borderRadius: "1px",
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                {label}
              </span>
            </div>
          ))}
        </Section>
      </div>

      {/* Footer actions */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleReset}
          style={{
            flex: 1,
            padding: "7px 0",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius)",
            color: "var(--text-secondary)",
            fontSize: "11px",
            cursor: "pointer",
            letterSpacing: "0.03em",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--text-muted)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
          }}
        >
          Reset
        </button>
        <button
          onClick={handleLaunch}
          disabled={probeActive && probeClassification === "pending"}
          style={{
            flex: 1,
            padding: "7px 0",
            background:
              probeActive && probeClassification === "pending"
                ? "var(--border-strong)"
                : "var(--accent)",
            border: "none",
            borderRadius: "var(--radius)",
            color: "#fff",
            fontSize: "11px",
            cursor:
              probeActive && probeClassification === "pending"
                ? "not-allowed"
                : "pointer",
            letterSpacing: "0.03em",
            fontWeight: 500,
            transition: "all 0.2s ease",
            opacity: probeActive && probeClassification === "pending" ? 0.6 : 1,
          }}
        >
          {probeActive && probeClassification === "pending"
            ? "Simulating..."
            : "Launch Probe"}
        </button>
      </div>
    </div>
  );
}
