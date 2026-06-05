import { useBlackHole } from "../hooks/useBlackHole";
import { useSimulation } from "../hooks/useSimulation";
import { useSimulationStore } from "../store/simulationStore";

// ─── Slider ───────────────────────────────────────────────────────────────────
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

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  display,
  onChange,
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
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

// ─── Toggle ───────────────────────────────────────────────────────────────────
interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

function Toggle({ label, value, onChange, hint }: ToggleProps) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "8px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div>
        <div
          style={{
            color: "var(--text-secondary)",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "10px",
              marginTop: "2px",
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: "32px",
          height: "18px",
          borderRadius: "9px",
          background: value ? "var(--accent)" : "var(--border-strong)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: value ? "16px" : "2px",
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: "var(--text-primary)",
            transition: "left 0.2s ease",
            display: "block",
          }}
        />
      </button>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ControlPanel() {
  const { config, updateConfig, schwarzschildRadius, hawkingTemp, isLoading } =
    useBlackHole();
  const { saveSimulation, shareSimulation, isSaving } = useSimulation();
  const { analysis } = useSimulationStore();

  const formatMass = (m: number) => {
    if (m >= 1e9) return `${(m / 1e9).toFixed(2)}B`;
    if (m >= 1e6) return `${(m / 1e6).toFixed(2)}M`;
    return m.toFixed(1);
  };

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
        }}
      >
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
              background: isLoading ? "var(--warning)" : "var(--success)",
              boxShadow: isLoading
                ? "0 0 6px var(--warning)"
                : "0 0 6px var(--success)",
            }}
          />
          <span
            style={{
              color: "var(--text-primary)",
              fontWeight: 500,
              fontSize: "13px",
            }}
          >
            Black Hole Visualizer
          </span>
        </div>
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "10px",
            paddingLeft: "14px",
          }}
        >
          {isLoading ? "Computing physics..." : "Simulation active"}
        </div>
      </div>

      {/* Scrollable controls */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <Section title="Black Hole">
          <Slider
            label="Mass"
            value={config.mass}
            min={0.1}
            max={1e7}
            step={0.1}
            display={formatMass(config.mass)}
            unit=" M☉"
            onChange={(v) => updateConfig({ mass: v })}
          />
          <Slider
            label="Spin"
            value={config.spin}
            min={0}
            max={0.999}
            step={0.001}
            onChange={(v) => updateConfig({ spin: v })}
          />
          <Slider
            label="Accretion Rate"
            value={config.accretion_rate}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateConfig({ accretion_rate: v })}
          />
          <Slider
            label="Inclination"
            value={config.inclination}
            min={0}
            max={90}
            step={0.5}
            unit="°"
            onChange={(v) => updateConfig({ inclination: v })}
          />
        </Section>

        <Section title="Effects">
          <Toggle
            label="Time Dilation"
            value={config.time_dilation}
            hint="Show relativistic clock overlay"
            onChange={(v) => updateConfig({ time_dilation: v })}
          />
          <Toggle
            label="Hawking Radiation"
            value={config.hawking_on}
            hint="Visualize quantum evaporation"
            onChange={(v) => updateConfig({ hawking_on: v })}
          />
        </Section>

        {analysis && (
          <Section title="Physics Readout">
            {[
              ["Schwarzschild Radius", `${schwarzschildRadius} km`],
              [
                "Shadow Radius",
                `${analysis.lensing.shadow_radius.toFixed(2)} Rs`,
              ],
              [
                "Photon Sphere",
                `${analysis.lensing.photon_sphere_radius.toFixed(2)} Rs`,
              ],
              [
                "Einstein Ring",
                `${analysis.lensing.einstein_radius.toFixed(2)} Rs`,
              ],
              [
                "Deflection Angle",
                `${analysis.lensing.deflection_angle.toFixed(1)}°`,
              ],
              ["Time Factor", analysis.time_dilation.time_factor.toFixed(6)],
              [
                "Doppler (approach)",
                `x${analysis.doppler.approaching_factor.toFixed(3)}`,
              ],
              ["Hawking Temp", `${hawkingTemp} K`],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                  {k}
                </span>
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </Section>
        )}
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
          onClick={() => saveSimulation()}
          disabled={isSaving}
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
          }}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => shareSimulation()}
          style={{
            flex: 1,
            padding: "7px 0",
            background: "var(--accent)",
            border: "none",
            borderRadius: "var(--radius)",
            color: "#fff",
            fontSize: "11px",
            cursor: "pointer",
            letterSpacing: "0.03em",
            fontWeight: 500,
          }}
        >
          Share
        </button>
      </div>
    </div>
  );
}
