import { useSimulationStore } from "../store/simulationStore";
import { useState } from "react";

// ── Animated Slider with gaming aesthetic ────────────────────────────────────
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  display?: string;
  icon?: string;
  color?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, unit, display, icon, color = "#00e5ff", onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{ marginBottom: "2px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            color: isHovered ? color : "var(--text-secondary)",
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            transition: "color 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {icon && <span style={{ fontSize: "12px" }}>{icon}</span>}
          {label}
        </span>
        <span
          style={{
            color: color,
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: 700,
            textShadow: isHovered ? `0 0 8px ${color}66` : "none",
            transition: "text-shadow 0.3s ease",
          }}
        >
          {display ?? value}
          <span style={{ fontSize: "9px", opacity: 0.6, marginLeft: "2px" }}>{unit ?? ""}</span>
        </span>
      </div>
      {/* Track */}
      <div
        style={{
          position: "relative",
          height: "4px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        {/* Glow behind fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "-2px",
            height: "8px",
            width: `${pct}%`,
            background: `${color}22`,
            filter: "blur(4px)",
            borderRadius: "4px",
            transition: "width 0.15s ease",
          }}
        />
        {/* Fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: "2px",
            transition: "width 0.15s ease",
            boxShadow: `0 0 6px ${color}44`,
          }}
        />
        {/* Thumb indicator */}
        <div
          style={{
            position: "absolute",
            left: `${pct}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: isHovered ? "10px" : "6px",
            height: isHovered ? "10px" : "6px",
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}, 0 0 16px ${color}44`,
            transition: "all 0.2s ease",
            zIndex: 2,
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
            inset: "-8px 0",
            width: "100%",
            opacity: 0,
            cursor: "pointer",
            height: "20px",
          }}
        />
      </div>
    </div>
  );
}

// ── Section with gaming divider ──────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
          paddingBottom: "8px",
          borderBottom: "1px solid transparent",
          borderImage: "linear-gradient(90deg, #00e5ff33, transparent) 1",
        }}
      >
        {icon && (
          <span style={{ fontSize: "12px", filter: "drop-shadow(0 0 4px #00e5ff)" }}>{icon}</span>
        )}
        <span
          style={{
            color: "#00e5ff",
            fontSize: "9px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
          }}
        >
          {title}
        </span>
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "linear-gradient(90deg, #00e5ff22, transparent)",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {children}
      </div>
    </div>
  );
}

// ── Circular Speed Gauge ─────────────────────────────────────────────────────
function SpeedGauge({ speed, maxSpeed = 0.5 }: { speed: number; maxSpeed?: number }) {
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 36;
  const strokeWidth = 4;

  const pct = speed / maxSpeed;
  const startAngle = 135;
  const endAngle = 405;
  const range = endAngle - startAngle;
  const sweepAngle = range * pct;

  const polarToCartesian = (centerX: number, centerY: number, r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: centerX + r * Math.cos(rad), y: centerY + r * Math.sin(rad) };
  };

  const arc = (start: number, end: number) => {
    const s = polarToCartesian(cx, cy, radius, start);
    const e = polarToCartesian(cx, cy, radius, end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  // Color transitions from cyan → yellow → red
  const gaugeColor = pct < 0.5
    ? "#00e5ff"
    : pct < 0.8
      ? "#f59e0b"
      : "#ff4444";

  // Tick marks
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const angle = startAngle + (range * i) / 10;
    const inner = polarToCartesian(cx, cy, radius - 8, angle);
    const outer = polarToCartesian(cx, cy, radius - 3, angle);
    ticks.push(
      <line
        key={i}
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke={i / 10 <= pct ? gaugeColor : "rgba(255,255,255,0.1)"}
        strokeWidth={i % 5 === 0 ? "1.5" : "0.8"}
        strokeLinecap="round"
      />
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path d={arc(startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Value arc */}
        {sweepAngle > 0 && (
          <path
            d={arc(startAngle, startAngle + sweepAngle)}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${gaugeColor}88)` }}
          />
        )}
        {/* Ticks */}
        {ticks}
        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={gaugeColor} fontSize="16" fontWeight="700" fontFamily="var(--font-mono)">
          {speed.toFixed(3)}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="var(--font-mono)" letterSpacing="0.1em">
          SPEED (c)
        </text>
      </svg>
    </div>
  );
}

// ── Angle Indicator (enhanced) ───────────────────────────────────────────────
function AngleIndicator({ angle }: { angle: number }) {
  const size = 80;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 28;

  const rad = (angle * Math.PI) / 180;
  const arrowLen = 22;
  const ax = cx - arrowLen * Math.cos(rad);
  const ay = cy - arrowLen * Math.sin(rad);

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="scanGrad">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Scanner sweep — pure CSS animation, no React state */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "scanSweep 6s linear infinite" }}>
          <path
            d={`M ${cx} ${cy} L ${cx + radius + 4} ${cy} A ${radius + 4} ${radius + 4} 0 0 1 ${cx + (radius + 4) * Math.cos(Math.PI / 6)} ${cy - (radius + 4) * Math.sin(Math.PI / 6)} Z`}
            fill="url(#scanGrad)"
          />
        </g>

        {/* Background circle */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(0,229,255,0.15)" strokeWidth="1" />
        {/* Grid lines */}
        <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="rgba(0,229,255,0.08)" strokeWidth="0.5" />
        <line x1={cx} y1={cy - radius} x2={cx} y2={cy + radius} stroke="rgba(0,229,255,0.08)" strokeWidth="0.5" />

        {/* Inner circle */}
        <circle cx={cx} cy={cy} r={radius * 0.5} fill="none" stroke="rgba(0,229,255,0.08)" strokeWidth="0.5" strokeDasharray="2 3" />

        {/* Black hole dot */}
        <circle cx={cx - radius - 6} cy={cy} r="4" fill="#111" stroke="rgba(239,68,68,0.6)" strokeWidth="1" />

        {/* Radial direction line */}
        <line x1={cx} y1={cy} x2={cx - radius} y2={cy} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" strokeDasharray="2 2" />

        {/* Velocity arrow */}
        <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#00e5ff" strokeWidth="2" strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 4px #00e5ff)" }}
        />
        {/* Arrowhead glow */}
        <circle cx={ax} cy={ay} r="3.5" fill="#00e5ff" style={{ filter: "drop-shadow(0 0 6px #00e5ff)" }} />

        {/* Center */}
        <circle cx={cx} cy={cy} r="2" fill="#fff" />

        {/* Angle label */}
        <text x={cx} y={size - 1} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="var(--font-mono)">
          {angle}° TRAJECTORY
        </text>
      </svg>
    </div>
  );
}

// ── Telemetry Mini Row ───────────────────────────────────────────────────────
function TelemetryRow({ label, value, unit, color = "#00e5ff" }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 8px",
        background: "rgba(0,229,255,0.03)",
        borderRadius: "4px",
        borderLeft: `2px solid ${color}33`,
      }}
    >
      <span style={{ color: "var(--text-muted)", fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ color, fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
        {value}
        {unit && <span style={{ fontSize: "8px", opacity: 0.5, marginLeft: "2px" }}>{unit}</span>}
      </span>
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
    spaghettifyActive,
    spaghettifyDone,
    setSpaghettifyActive,
    resetSpaghettify,
  } = useSimulationStore();

  const [launchHovered, setLaunchHovered] = useState(false);
  const [resetHovered, setResetHovered] = useState(false);
  const [dropHovered, setDropHovered] = useState(false);
  const [probeMode, setProbeMode] = useState<"probe" | "drop">("probe");

  const handleLaunch = () => {
    resetProbe();
    setTimeout(() => {
      setProbeActive(true);
    }, 50);
  };

  const handleReset = () => {
    resetProbe();
    resetSpaghettify();
  };

  const handleDrop = () => {
    resetSpaghettify();
    resetProbe();
    setTimeout(() => {
      setSpaghettifyActive(true);
    }, 50);
  };

  const classificationColor = (() => {
    switch (probeClassification) {
      case "capture": return "#ff4444";
      case "escape": return "#10b981";
      case "stable_orbit": return "#3b82f6";
      case "pending": return "#f59e0b";
      default: return "#00e5ff";
    }
  })();

  const classificationLabel = (() => {
    switch (probeClassification) {
      case "capture": return "CAPTURED BY SINGULARITY";
      case "escape": return "ESCAPE VELOCITY ACHIEVED";
      case "stable_orbit": return "STABLE ORBIT LOCKED";
      case "pending": return "TRAJECTORY COMPUTING...";
      default: return "AWAITING LAUNCH";
    }
  })();

  const classificationIcon = (() => {
    switch (probeClassification) {
      case "capture": return "✕";
      case "escape": return "↗";
      case "stable_orbit": return "⟳";
      case "pending": return "◌";
      default: return "◎";
    }
  })();

  const isPending = probeActive && probeClassification === "pending";
  const isFinished = probeClassification && probeClassification !== "pending";

  // Compute derived telemetry values
  const escapeVelocity = Math.sqrt(1 / probeConfig.startR).toFixed(3);
  const orbitalPeriod = (2 * Math.PI * Math.pow(probeConfig.startR, 1.5)).toFixed(1);
  const gForce = (1 / (2 * probeConfig.startR * probeConfig.startR * Math.sqrt(1 - 1 / probeConfig.startR))).toFixed(2);

  return (
    <div
      style={{
        width: "260px",
        height: "100%",
        background: "linear-gradient(180deg, rgba(0,10,20,0.95), rgba(5,5,15,0.98))",
        borderRight: "1px solid rgba(0,229,255,0.12)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.015) 2px, rgba(0,229,255,0.015) 4px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Corner accents */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "20px", height: "20px", borderTop: "2px solid #00e5ff33", borderLeft: "2px solid #00e5ff33", pointerEvents: "none", zIndex: 2 }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: "20px", height: "20px", borderTop: "2px solid #00e5ff33", borderRight: "2px solid #00e5ff33", pointerEvents: "none", zIndex: 2 }} />

      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid rgba(0,229,255,0.12)",
          flexShrink: 0,
          position: "relative",
          zIndex: 2,
          background: "linear-gradient(180deg, rgba(0,229,255,0.05), transparent)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: probeActive ? "#00e5ff" : "var(--text-muted)",
              boxShadow: probeActive
                ? "0 0 8px #00e5ff, 0 0 16px #00e5ff44"
                : "none",
              transition: "all 0.3s ease",
              animation: isPending ? "pulse 1s ease-in-out infinite" : "none",
            }}
          />
          <span
            style={{
              color: "#e2e8f0",
              fontWeight: 700,
              fontSize: "13px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Probe Command
          </span>
        </div>
        <div
          style={{
            color: "rgba(0,229,255,0.5)",
            fontSize: "9px",
            paddingLeft: "18px",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
          }}
        >
          SCHWARZSCHILD GEODESIC NAV
        </div>
      </div>

      {/* Status Badge */}
      <div
        style={{
          margin: "12px 16px 0",
          padding: "10px 12px",
          background: `linear-gradient(135deg, ${classificationColor}08, ${classificationColor}15)`,
          border: `1px solid ${classificationColor}33`,
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          position: "relative",
          zIndex: 2,
          overflow: "hidden",
          animation: isPending ? "borderPulse 2s ease-in-out infinite" : "none",
        }}
      >
        {/* Animated border glow for active states */}
        {(isPending || isFinished) && (
          <div
            style={{
              position: "absolute",
              inset: -1,
              borderRadius: "6px",
              border: `1px solid ${classificationColor}`,
              opacity: isPending ? 0.4 : 0.6,
              animation: isPending ? "pulse 1.5s ease-in-out infinite" : "none",
              pointerEvents: "none",
            }}
          />
        )}
        <span style={{ fontSize: "14px", fontWeight: 700, color: classificationColor, filter: `drop-shadow(0 0 6px ${classificationColor})` }}>{classificationIcon}</span>
        <div>
          <div
            style={{
              color: classificationColor,
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textShadow: `0 0 8px ${classificationColor}44`,
            }}
          >
            {classificationLabel}
          </div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "8px", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
            {probeActive ? "PROBE ACTIVE" : "PROBE STANDBY"}
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div
        style={{
          margin: "12px 16px 0",
          display: "flex",
          gap: "4px",
          padding: "3px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {(["probe", "drop"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setProbeMode(mode);
              handleReset();
            }}
            style={{
              flex: 1,
              padding: "6px 0",
              background: probeMode === mode
                ? mode === "probe"
                  ? "rgba(0,229,255,0.12)"
                  : "rgba(245,158,11,0.12)"
                : "transparent",
              border: probeMode === mode
                ? `1px solid ${mode === "probe" ? "rgba(0,229,255,0.3)" : "rgba(245,158,11,0.3)"}`
                : "1px solid transparent",
              borderRadius: "4px",
              color: probeMode === mode
                ? mode === "probe" ? "#00e5ff" : "#fbbf24"
                : "var(--text-muted)",
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {mode === "probe" ? "\u25B8 PROBE" : "\u2193 DROP"}
          </button>
        ))}
      </div>

      {/* Scrollable controls */
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", position: "relative", zIndex: 2 }}>
        <Section title="Launch Vector" icon="⊹">
          <Slider
            label="Orbit Radius"
            value={probeConfig.startR}
            min={2}
            max={30}
            step={0.5}
            display={probeConfig.startR.toFixed(1)}
            unit="Rs"
            icon="⊕"
            color="#00e5ff"
            onChange={(v) => setProbeConfig({ startR: v })}
          />
          <Slider
            label="Trajectory Angle"
            value={probeConfig.angle}
            min={0}
            max={180}
            step={1}
            display={probeConfig.angle.toFixed(0)}
            unit="°"
            icon="∠"
            color="#a78bfa"
            onChange={(v) => setProbeConfig({ angle: v })}
          />
          <AngleIndicator angle={probeConfig.angle} />
        </Section>

        <Section title="Velocity" icon="▸">
          <SpeedGauge speed={probeConfig.speed} />
          <Slider
            label="Thrust Power"
            value={probeConfig.speed}
            min={0.01}
            max={0.5}
            step={0.005}
            display={probeConfig.speed.toFixed(3)}
            unit="c"
            icon="▶"
            color={probeConfig.speed > 0.35 ? "#ff4444" : probeConfig.speed > 0.2 ? "#f59e0b" : "#00e5ff"}
            onChange={(v) => setProbeConfig({ speed: v })}
          />
          {probeConfig.speed > 0.35 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 8px",
              background: "rgba(255,68,68,0.08)",
              border: "1px solid rgba(255,68,68,0.2)",
              borderRadius: "4px",
              animation: "pulse 1.5s ease-in-out infinite",
            }}>
              <span style={{ fontSize: "10px", color: "#ff6b6b", fontWeight: 700 }}>!!</span>
              <span style={{ color: "#ff6b6b", fontSize: "8px", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                RELATIVISTIC VELOCITY WARNING
              </span>
            </div>
          )}
        </Section>

        <Section title="Telemetry" icon="◈">
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <TelemetryRow label="V_esc" value={escapeVelocity} unit="c" color={probeConfig.speed >= parseFloat(escapeVelocity) ? "#10b981" : "#f59e0b"} />
            <TelemetryRow label="T_orbit" value={orbitalPeriod} unit="τ" />
            <TelemetryRow label="G-Force" value={gForce} unit="g" color={parseFloat(gForce) > 5 ? "#ff4444" : "#00e5ff"} />
            <TelemetryRow label="Horizon" value={probeConfig.startR > 1 ? (probeConfig.startR - 1).toFixed(1) : "!!"} unit="Rs" color={probeConfig.startR < 3 ? "#ff4444" : "#00e5ff"} />
          </div>
        </Section>

        {/* Reference zones */}
        <Section title="Danger Zones" icon="◉">
          {[
            { label: "EVENT HORIZON", dist: "1.0 Rs", color: "#ff4444", icon: "◉" },
            { label: "PHOTON SPHERE", dist: "1.5 Rs", color: "#f59e0b", icon: "◎" },
            { label: "ISCO BOUNDARY", dist: "3.0 Rs", color: "#00e5ff", icon: "◌" },
          ].map(({ label, dist, color, icon }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color, fontSize: "10px", filter: `drop-shadow(0 0 3px ${color})` }}>{icon}</span>
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
                  {label}
                </span>
              </div>
              <span style={{ color, fontSize: "9px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{dist}</span>
            </div>
          ))}
        </Section>

        {/* Angle reference legend */}
        <Section title="Nav Reference" icon="⊿">
          {[
            { label: "0° = RADIAL INWARD", desc: "Direct approach" },
            { label: "90° = TANGENTIAL", desc: "Orbital insertion" },
            { label: "180° = RADIAL OUTWARD", desc: "Escape trajectory" },
          ].map(({ label, desc }) => (
            <div key={label} style={{ marginBottom: "2px" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                {label}
              </div>
              <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "8px", fontFamily: "var(--font-mono)", paddingLeft: "8px" }}>
                └ {desc}
              </div>
            </div>
          ))}
        </Section>
      </div>

      {/* Footer actions */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(0,229,255,0.12)",
          display: "flex",
          gap: "8px",
          flexShrink: 0,
          position: "relative",
          zIndex: 2,
          background: "linear-gradient(0deg, rgba(0,229,255,0.03), transparent)",
        }}
      >
        <button
          onClick={handleReset}
          onMouseEnter={() => setResetHovered(true)}
          onMouseLeave={() => setResetHovered(false)}
          style={{
            flex: 1,
            padding: "10px 0",
            background: resetHovered ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${resetHovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "6px",
            color: resetHovered ? "#e2e8f0" : "var(--text-muted)",
            fontSize: "10px",
            cursor: "pointer",
            letterSpacing: "0.1em",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            textTransform: "uppercase",
            transition: "all 0.25s ease",
          }}
        >
          \u27f2 ABORT
        </button>
        {probeMode === "probe" ? (
          <button
            onClick={handleLaunch}
            disabled={isPending}
            onMouseEnter={() => setLaunchHovered(true)}
            onMouseLeave={() => setLaunchHovered(false)}
            style={{
              flex: 1.5,
              padding: "10px 0",
              background: isPending
                ? "rgba(245,158,11,0.15)"
                : launchHovered
                  ? "linear-gradient(135deg, #00e5ff, #0088cc)"
                  : "linear-gradient(135deg, #00b8d4, #006994)",
              border: isPending
                ? "1px solid rgba(245,158,11,0.3)"
                : `1px solid ${launchHovered ? "#00e5ff" : "#00b8d4"}`,
              borderRadius: "6px",
              color: "#fff",
              fontSize: "10px",
              cursor: isPending ? "not-allowed" : "pointer",
              letterSpacing: "0.1em",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              textTransform: "uppercase",
              transition: "all 0.25s ease",
              opacity: isPending ? 0.6 : 1,
              boxShadow: launchHovered && !isPending
                ? "0 0 20px rgba(0,229,255,0.3), inset 0 0 20px rgba(0,229,255,0.1)"
                : "0 0 10px rgba(0,229,255,0.1)",
              textShadow: "0 0 8px rgba(0,229,255,0.5)",
            }}
          >
            {isPending ? "\u25cc COMPUTING..." : "\u25b6 LAUNCH PROBE"}
          </button>
        ) : (
          <button
            onClick={handleDrop}
            disabled={spaghettifyActive && !spaghettifyDone}
            onMouseEnter={() => setDropHovered(true)}
            onMouseLeave={() => setDropHovered(false)}
            style={{
              flex: 1.5,
              padding: "10px 0",
              background: (spaghettifyActive && !spaghettifyDone)
                ? "rgba(245,158,11,0.15)"
                : dropHovered
                  ? "linear-gradient(135deg, #fbbf24, #d97706)"
                  : "linear-gradient(135deg, #f59e0b, #b45309)",
              border: (spaghettifyActive && !spaghettifyDone)
                ? "1px solid rgba(245,158,11,0.3)"
                : `1px solid ${dropHovered ? "#fbbf24" : "#f59e0b"}`,
              borderRadius: "6px",
              color: "#fff",
              fontSize: "10px",
              cursor: (spaghettifyActive && !spaghettifyDone) ? "not-allowed" : "pointer",
              letterSpacing: "0.1em",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              textTransform: "uppercase",
              transition: "all 0.25s ease",
              opacity: (spaghettifyActive && !spaghettifyDone) ? 0.6 : 1,
              boxShadow: dropHovered && !(spaghettifyActive && !spaghettifyDone)
                ? "0 0 20px rgba(245,158,11,0.3), inset 0 0 20px rgba(245,158,11,0.1)"
                : "0 0 10px rgba(245,158,11,0.1)",
              textShadow: "0 0 8px rgba(245,158,11,0.5)",
            }}
          >
            {(spaghettifyActive && !spaghettifyDone) ? "\u25cc FALLING..." : "\u2193 DROP OBJECT"}
          </button>
        )
      </div>

      <style>{`
        @keyframes borderPulse {
          0%, 100% { box-shadow: 0 0 0px transparent; }
          50% { box-shadow: 0 0 12px rgba(245,158,11,0.15); }
        }
        @keyframes scanSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
