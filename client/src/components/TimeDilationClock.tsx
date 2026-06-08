import { useRef, useEffect, useState, useCallback } from "react";
import { useSimulationStore } from "../store/simulationStore";

/**
 * Gravitational Time Dilation Clock
 *
 * Two analog clocks side by side:
 *  - Far Observer: ticks at normal speed
 *  - Near Horizon: ticks slower based on Schwarzschild time dilation
 *
 * Formula: t_factor = sqrt(1 - Rs/r)  where r is in Rs units
 */

// ── Clock face renderer ──────────────────────────────────────────────────────
function drawClock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seconds: number,
  label: string,
  accentColor: string,
  factor: number,
  dpr: number,
) {
  ctx.save();

  // Outer ring glow
  ctx.strokeStyle = accentColor.replace(/[\d.]+\)$/, "0.12)");
  ctx.lineWidth = 6 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3 * dpr, 0, Math.PI * 2);
  ctx.stroke();

  // Clock face background
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  bgGrad.addColorStop(0, "rgba(10, 15, 25, 0.95)");
  bgGrad.addColorStop(1, "rgba(5, 8, 15, 0.98)");
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Clock border
  ctx.strokeStyle = accentColor.replace(/[\d.]+\)$/, "0.35)");
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Tick marks
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const innerR = radius - (isMajor ? 10 : 6) * dpr;
    const outerR = radius - 3 * dpr;

    ctx.strokeStyle = isMajor
      ? accentColor.replace(/[\d.]+\)$/, "0.5)")
      : "rgba(255,255,255,0.12)";
    ctx.lineWidth = (isMajor ? 1.5 : 0.8) * dpr;
    ctx.beginPath();
    ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
    ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
    ctx.stroke();
  }

  // Hour numbers
  ctx.fillStyle = accentColor.replace(/[\d.]+\)$/, "0.35)");
  ctx.font = `${7 * dpr}px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 1; i <= 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const numR = radius - 18 * dpr;
    ctx.fillText(
      i.toString(),
      cx + numR * Math.cos(angle),
      cy + numR * Math.sin(angle),
    );
  }

  // Compute hand angles
  const totalSeconds = seconds;
  const secAngle = ((totalSeconds % 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const minAngle =
    ((totalSeconds % 3600) / 3600) * Math.PI * 2 - Math.PI / 2;
  const hourAngle =
    ((totalSeconds % 43200) / 43200) * Math.PI * 2 - Math.PI / 2;

  // Hour hand
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2.5 * dpr;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + radius * 0.45 * Math.cos(hourAngle),
    cy + radius * 0.45 * Math.sin(hourAngle),
  );
  ctx.stroke();

  // Minute hand
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.8 * dpr;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + radius * 0.65 * Math.cos(minAngle),
    cy + radius * 0.65 * Math.sin(minAngle),
  );
  ctx.stroke();

  // Second hand
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1 * dpr;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 6 * dpr;
  ctx.beginPath();
  ctx.moveTo(
    cx - radius * 0.1 * Math.cos(secAngle),
    cy - radius * 0.1 * Math.sin(secAngle),
  );
  ctx.lineTo(
    cx + radius * 0.72 * Math.cos(secAngle),
    cy + radius * 0.72 * Math.sin(secAngle),
  );
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Center cap
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
  ctx.fill();

  // Label below clock
  ctx.fillStyle = accentColor.replace(/[\d.]+\)$/, "0.6)");
  ctx.font = `bold ${7 * dpr}px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(label, cx, cy + radius + 10 * dpr);

  // Factor label
  ctx.fillStyle = accentColor.replace(/[\d.]+\)$/, "0.35)");
  ctx.font = `${6 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillText(`${factor.toFixed(4)}x`, cx, cy + radius + 22 * dpr);

  ctx.restore();
}

// ── Slider for observer distance ─────────────────────────────────────────────
function DistanceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const min = 1.05;
  const max = 50;
  const pct = ((value - min) / (max - min)) * 100;

  // Color shifts from red (close) to cyan (far)
  const color =
    value < 2
      ? "#ff4444"
      : value < 5
        ? "#f59e0b"
        : "#00e5ff";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
      <span
        style={{
          color: "rgba(255,255,255,0.35)",
          fontSize: "8px",
          fontFamily: "var(--font-mono)",
          flexShrink: 0,
          width: "42px",
        }}
      >
        R = {value.toFixed(1)} Rs
      </span>
      <div
        style={{
          flex: 1,
          position: "relative",
          height: "3px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "2px",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, #ff444488, ${color})`,
            borderRadius: "2px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${pct}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={0.05}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute",
            inset: "-8px 0",
            width: "100%",
            height: "20px",
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function TimeDilationClock() {
  const { config, showTimeClock, setShowTimeClock } = useSimulationStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const [observerR, setObserverR] = useState(6);

  // Time dilation factor: sqrt(1 - 1/r) where r is in Rs units
  const timeFactor = Math.sqrt(Math.max(1 - 1 / observerR, 0));

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Real elapsed time in seconds
    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    // Far observer: normal time
    const farSeconds = elapsed;
    // Near observer: dilated time
    const nearSeconds = elapsed * timeFactor;

    const clockRadius = Math.min(w * 0.18, h * 0.32, 70 * dpr);
    const gap = 30 * dpr;
    const totalWidth = clockRadius * 4 + gap;
    const startX = (w - totalWidth) / 2 + clockRadius;
    const clockY = h * 0.5;

    // Draw far observer clock (left)
    drawClock(
      ctx,
      startX,
      clockY,
      clockRadius,
      farSeconds,
      "FAR OBSERVER",
      "rgba(0, 229, 255, 0.8)",
      1.0,
      dpr,
    );

    // Draw near observer clock (right)
    drawClock(
      ctx,
      startX + clockRadius * 2 + gap,
      clockY,
      clockRadius,
      nearSeconds,
      `NEAR HORIZON`,
      timeFactor < 0.3
        ? "rgba(239, 68, 68, 0.8)"
        : timeFactor < 0.7
          ? "rgba(245, 158, 11, 0.8)"
          : "rgba(0, 229, 255, 0.8)",
      timeFactor,
      dpr,
    );

    // Draw connecting info between clocks
    const midX = startX + clockRadius + gap / 2;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = `${7 * dpr}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VS", midX, clockY);

    // Time ratio explanation
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = `${6 * dpr}px "JetBrains Mono", monospace`;
    const ratio = timeFactor > 0.001 ? (1 / timeFactor).toFixed(2) : "∞";
    ctx.fillText(`1s here =`, midX, clockY + clockRadius + 10 * dpr);
    ctx.fillStyle = timeFactor < 0.3 ? "rgba(239,68,68,0.7)" : "rgba(0,229,255,0.6)";
    ctx.font = `bold ${7 * dpr}px "JetBrains Mono", monospace`;
    ctx.fillText(`${ratio}s there`, midX, clockY + clockRadius + 22 * dpr);
    ctx.restore();

    animRef.current = requestAnimationFrame(draw);
  }, [timeFactor]);

  // Canvas resize + animation loop
  useEffect(() => {
    if (!showTimeClock) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth * window.devicePixelRatio;
      canvas.height = parent.clientHeight * window.devicePixelRatio;
      canvas.style.width = parent.clientWidth + "px";
      canvas.style.height = parent.clientHeight + "px";
    };
    resize();
    window.addEventListener("resize", resize);

    startTimeRef.current = Date.now();
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [showTimeClock, draw]);

  if (!showTimeClock) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        pointerEvents: "auto",
      }}
    >
      {/* Clock canvas */}
      <div
        style={{
          position: "relative",
          width: "380px",
          height: "220px",
          background: "rgba(5, 8, 15, 0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(0, 229, 255, 0.15)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(0,229,255,0.2)",
        }}
      >
        {/* Scanline effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.01) 2px, rgba(0,229,255,0.01) 4px)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Title bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(0,229,255,0.08)",
            background: "rgba(0,229,255,0.03)",
            zIndex: 2,
          }}
        >
          <span
            style={{
              color: "rgba(0,229,255,0.6)",
              fontSize: "8px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Gravitational Time Dilation
          </span>
          <button
            onClick={() => setShowTimeClock(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.3)",
              cursor: "pointer",
              fontSize: "12px",
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </div>

      {/* Observer distance slider */}
      <div
        style={{
          width: "380px",
          padding: "8px 14px",
          background: "rgba(5, 8, 15, 0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(0, 229, 255, 0.15)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: "7px",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          OBSERVER
        </span>
        <DistanceSlider value={observerR} onChange={setObserverR} />
      </div>
    </div>
  );
}
