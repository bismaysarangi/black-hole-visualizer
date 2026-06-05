import { useRef, useState, useEffect, useCallback } from "react";
import { useSimulationStore } from "../store/simulationStore";

interface SaveModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SaveModal({ open, onClose }: SaveModalProps) {
  const { config, analysis } = useSimulationStore();
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  // Derived display values — same logic as ControlPanel
  const schwarzschildRadius = (config.mass * 2.95).toFixed(2);
  const hawkingTemp =
    config.mass > 0 ? (1.227e23 / config.mass).toExponential(3) : "0";

  const formatMass = (m: number) => {
    if (m >= 1e9) return `${(m / 1e9).toFixed(2)}B M☉`;
    if (m >= 1e6) return `${(m / 1e6).toFixed(2)}M M☉`;
    return `${m.toFixed(2)} M☉`;
  };

  const rows: [string, string][] = [
    ["Mass", formatMass(config.mass)],
    ["Spin (a)", config.spin.toFixed(4)],
    ["Accretion Rate", `${(config.accretion_rate * 100).toFixed(0)}%`],
    ["Inclination", `${config.inclination.toFixed(1)}°`],
    ["Schwarzschild Radius", `${schwarzschildRadius} km`],
    ["Hawking Temperature", `${hawkingTemp} K`],
    ...(analysis
      ? ([
          ["Shadow Radius", `${analysis.lensing.shadow_radius.toFixed(3)} Rs`],
          [
            "Photon Sphere",
            `${analysis.lensing.photon_sphere_radius.toFixed(3)} Rs`,
          ],
          [
            "Einstein Ring",
            `${analysis.lensing.einstein_radius.toFixed(3)} Rs`,
          ],
          [
            "Deflection Angle",
            `${analysis.lensing.deflection_angle.toFixed(2)}°`,
          ],
          ["Time Factor", analysis.time_dilation.time_factor.toFixed(6)],
          [
            "Doppler (approach)",
            `×${analysis.doppler.approaching_factor.toFixed(4)}`,
          ],
          [
            "Doppler (recede)",
            `×${analysis.doppler.receding_factor.toFixed(4)}`,
          ],
        ] as [string, string][])
      : []),
    ["Time Dilation", config.time_dilation ? "Enabled" : "Disabled"],
    ["Hawking Radiation", config.hawking_on ? "Enabled" : "Disabled"],
  ];

  const drawPreview = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas) return;

    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Background ──────────────────────────────────────────────
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    // Subtle star field
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    const rng = (seed: number) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 180; i++) {
      const sx = rng(i * 3.1) * W;
      const sy = rng(i * 7.9) * H;
      const sr = rng(i * 2.3) * 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Black hole visual (left half) ───────────────────────────
    const cx = W * 0.28;
    const cy = H * 0.42;
    const rs = Math.min(W, H) * 0.11;

    // Outer glow rings
    for (let i = 4; i >= 1; i--) {
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        rs * i * 0.5,
        cx,
        cy,
        rs * i * 1.6,
      );
      grad.addColorStop(0, `rgba(59,130,246,${0.04 * i})`);
      grad.addColorStop(1, "rgba(59,130,246,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rs * i * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Accretion disk — ellipse behind BH
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.28);
    for (let i = 0; i < 3; i++) {
      const diskGrad = ctx.createRadialGradient(
        0,
        0,
        rs * 1.1,
        0,
        0,
        rs * (3.2 - i * 0.3),
      );
      diskGrad.addColorStop(
        0,
        i === 0
          ? "rgba(220,200,255,0.55)"
          : i === 1
            ? "rgba(255,160,60,0.35)"
            : "rgba(180,40,20,0.2)",
      );
      diskGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = diskGrad;
      ctx.beginPath();
      ctx.arc(0, 0, rs * (3.2 - i * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Corona / photon sphere glow
    const coronaGrad = ctx.createRadialGradient(
      cx,
      cy,
      rs * 0.9,
      cx,
      cy,
      rs * 2.2,
    );
    coronaGrad.addColorStop(0, "rgba(100,160,255,0.22)");
    coronaGrad.addColorStop(0.5, "rgba(59,100,200,0.08)");
    coronaGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, rs * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Event horizon — pure black
    const ehGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rs);
    ehGrad.addColorStop(0.7, "#000000");
    ehGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ehGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, rs, 0, Math.PI * 2);
    ctx.fill();

    // ── Right panel — data readout ───────────────────────────────
    const panelX = W * 0.52;
    const panelW = W - panelX - 24;

    // Panel background
    ctx.fillStyle = "rgba(17,17,17,0.92)";
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1;
    roundRect(ctx, panelX, 20, panelW, H - 40, 8);
    ctx.fill();
    ctx.stroke();

    // Header accent line
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(panelX + 16, 36, 3, 22);

    // Title
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    ctx.fillText("BLACK HOLE VISUALIZER", panelX + 26, 52);

    ctx.fillStyle = "#808080";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("SIMULATION READOUT", panelX + 26, 67);

    // Divider
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 16, 78);
    ctx.lineTo(panelX + panelW - 16, 78);
    ctx.stroke();

    // Data rows
    const rowH = (H - 40 - 90 - 40) / rows.length;
    rows.forEach(([key, val], idx) => {
      const ry = 90 + idx * rowH;

      // Subtle alternating bg
      if (idx % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.015)";
        roundRect(ctx, panelX + 12, ry - 2, panelW - 24, rowH - 1, 3);
        ctx.fill();
      }

      // Key
      ctx.fillStyle = "#808080";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText(key.toUpperCase(), panelX + 20, ry + rowH * 0.55);

      // Value — right-aligned
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      const valW = ctx.measureText(val).width;
      ctx.fillText(val, panelX + panelW - 20 - valW, ry + rowH * 0.55);

      // Dotted connector
      ctx.strokeStyle = "#1e1e1e";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      const keyW = ctx.measureText(key.toUpperCase()).width;
      ctx.beginPath();
      ctx.moveTo(panelX + 24 + keyW + 4, ry + rowH * 0.5);
      ctx.lineTo(panelX + panelW - 24 - valW - 4, ry + rowH * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Footer
    ctx.fillStyle = "#2e2e2e";
    ctx.fillRect(panelX + 12, H - 52, panelW - 24, 1);

    ctx.fillStyle = "#404040";
    ctx.font = "9px 'JetBrains Mono', monospace";
    const ts =
      new Date().toISOString().replace("T", "  ").slice(0, 19) + " UTC";
    ctx.fillText(ts, panelX + 20, H - 36);

    ctx.fillStyle = "#3b82f6";
    ctx.font = "9px 'JetBrains Mono', monospace";
    const url = "black-hole-visualizer.vercel.app";
    const urlW = ctx.measureText(url).width;
    ctx.fillText(url, panelX + panelW - 20 - urlW, H - 36);

    setPreviewReady(true);
  }, [config, analysis, rows]);

  useEffect(() => {
    if (open) {
      setPreviewReady(false);
      // give modal time to mount
      const t = setTimeout(drawPreview, 80);
      return () => clearTimeout(t);
    }
  }, [open, drawPreview]);

  const handleDownload = () => {
    const canvas = previewRef.current;
    if (!canvas) return;
    setDownloading(true);

    const slug =
      `blackhole_M${config.mass.toFixed(0)}_a${config.spin.toFixed(3)}`
        .replace(/\./g, "p")
        .replace(/[^a-zA-Z0-9_]/g, "");

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloading(false);
      },
      "image/png",
      1.0,
    );
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(6px)",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px",
          width: "min(680px, 100%)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: "13px",
                marginBottom: "3px",
              }}
            >
              Export Simulation
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>
              Downloads a PNG with full physics readout
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--text-muted)",
              fontSize: "11px",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        {/* Canvas preview */}
        <div
          style={{
            borderRadius: "var(--radius)",
            overflow: "hidden",
            border: "1px solid var(--border)",
            background: "#0a0a0a",
            position: "relative",
            lineHeight: 0,
          }}
        >
          <canvas
            ref={previewRef}
            width={900}
            height={480}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              opacity: previewReady ? 1 : 0,
              transition: "opacity 0.2s ease",
            }}
          />
          {!previewReady && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
              }}
            >
              RENDERING...
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleDownload}
            disabled={!previewReady || downloading}
            style={{
              flex: 1,
              padding: "9px 0",
              background:
                previewReady && !downloading
                  ? "var(--accent)"
                  : "var(--bg-elevated)",
              border: "none",
              borderRadius: "var(--radius)",
              color:
                previewReady && !downloading ? "#fff" : "var(--text-disabled)",
              fontSize: "11px",
              fontWeight: 600,
              cursor: previewReady && !downloading ? "pointer" : "default",
              letterSpacing: "0.05em",
              transition: "background 0.2s ease",
            }}
          >
            {downloading ? "Downloading..." : "Download PNG"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius)",
              color: "var(--text-secondary)",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Utility: rounded rect path ────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
