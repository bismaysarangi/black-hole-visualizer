import { useRef, useEffect, useCallback } from "react";
import { useSimulationStore } from "../store/simulationStore";
import { initGeodesic, stepGeodesic, type GeodesicState } from "../utils/geodesic";

/**
 * 2D canvas overlay that draws the spacecraft probe trajectory
 * over the WebGL black-hole visualization.
 */
export default function SpacecraftOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geodesicRef = useRef<GeodesicState | null>(null);
  const animIdRef = useRef(0);
  const trailRef = useRef<[number, number][]>([]);

  const {
    config,
    probeConfig,
    probeActive,
    probeClassification,
    setProbeClassification,
    appendProbePoint,
    resetProbe,
  } = useSimulationStore();

  // ── Coordinate mapping ─────────────────────────────────────────
  // Must match the WebGL shader's rs calculation:
  //   mass_norm = log10(mass+1) / log10(1e7+1)
  //   rs_uv     = 0.07 + mass_norm * 0.06
  const getRsPixels = useCallback(
    (canvas: HTMLCanvasElement) => {
      const massNorm =
        Math.log10(config.mass + 1) / Math.log10(1e7 + 1);
      const rsUV = 0.07 + massNorm * 0.06;
      // The UV space is [0,1] mapped to the canvas, so 1 UV unit = canvas.width pixels
      // But the shader uses aspect-corrected UV, so rsUV is in the Y direction
      return rsUV * Math.min(canvas.width, canvas.height);
    },
    [config.mass],
  );

  const toScreen = useCallback(
    (r: number, phi: number, canvas: HTMLCanvasElement): [number, number] => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const rs = getRsPixels(canvas);
      return [
        cx + r * rs * Math.cos(phi),
        cy - r * rs * Math.sin(phi), // flip Y for canvas
      ];
    },
    [getRsPixels],
  );

  // ── Reset when probe is deactivated or config changes ──────────
  useEffect(() => {
    if (!probeActive) {
      geodesicRef.current = null;
      trailRef.current = [];
    }
  }, [probeActive]);

  // ── Main animation loop ────────────────────────────────────────
  useEffect(() => {
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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const STEPS_PER_FRAME = 8;
    const DT = 0.04;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const rs = getRsPixels(canvas);

      // Always draw reference rings when probe tab is visible
      drawReferenceRings(ctx, cx, cy, rs);

      // If probe is active, step the physics and draw
      if (probeActive && probeClassification !== "capture" && probeClassification !== "escape" && probeClassification !== "stable_orbit") {
        if (!geodesicRef.current) {
          geodesicRef.current = initGeodesic(
            probeConfig.startR,
            probeConfig.angle,
            probeConfig.speed,
          );
          trailRef.current = [];
        }

        // Step multiple times per frame for smooth trails
        for (let i = 0; i < STEPS_PER_FRAME; i++) {
          if (!geodesicRef.current) break;
          geodesicRef.current = stepGeodesic(geodesicRef.current, DT);

          const [sx, sy] = toScreen(
            geodesicRef.current.r,
            geodesicRef.current.phi,
            canvas,
          );
          trailRef.current.push([sx, sy]);
          appendProbePoint([sx, sy]);

          if (geodesicRef.current.classification !== "pending") {
            setProbeClassification(geodesicRef.current.classification);
            break;
          }
        }
      }

      // Draw trail
      const trail = trailRef.current;
      if (trail.length > 1) {
        drawTrail(ctx, trail, probeClassification);
      }

      // Draw probe head
      if (trail.length > 0) {
        const [hx, hy] = trail[trail.length - 1];
        drawProbeHead(ctx, hx, hy, probeClassification, Date.now());
      }

      // Draw start position indicator (before launch)
      if (!probeActive && !probeClassification) {
        const [sx, sy] = toScreen(probeConfig.startR, 0, canvas);
        drawStartIndicator(ctx, sx, sy, probeConfig.angle);
      }

      // Draw classification badge
      if (probeClassification && probeClassification !== "pending") {
        drawClassificationBadge(ctx, w, h, probeClassification);
      }

      animIdRef.current = requestAnimationFrame(draw);
    };

    animIdRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [
    probeActive,
    probeConfig,
    probeClassification,
    config.mass,
    getRsPixels,
    toScreen,
    appendProbePoint,
    setProbeClassification,
    resetProbe,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
}

// ── Drawing helpers ─────────────────────────────────────────────────────────

function drawReferenceRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rs: number,
) {
  const dpr = window.devicePixelRatio;
  const rings = [
    { r: 1, color: "rgba(239, 68, 68, 0.7)", label: "Event Horizon", dash: [5*dpr, 4*dpr] },
    { r: 1.5, color: "rgba(245, 158, 11, 0.6)", label: "Photon Sphere", dash: [6*dpr, 4*dpr] },
    { r: 3, color: "rgba(6, 182, 212, 0.55)", label: "ISCO", dash: [8*dpr, 4*dpr] },
  ];

  ctx.save();
  const fontSize = 9 * dpr;
  ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;

  for (const ring of rings) {
    const radius = ring.r * rs;

    // Draw ring circle — thicker for visibility
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash(ring.dash);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Label with dark background pill
    ctx.setLineDash([]);
    const labelX = cx + radius * 0.707 + 8 * dpr;
    const labelY = cy - radius * 0.707 - 6 * dpr;
    const metrics = ctx.measureText(ring.label);
    const padH = 5 * dpr;
    const padV = 3 * dpr;
    const pillW = metrics.width + padH * 2;
    const pillH = fontSize + padV * 2;

    // Dark pill background
    ctx.fillStyle = "rgba(5, 5, 5, 0.85)";
    ctx.beginPath();
    ctx.roundRect(labelX - padH, labelY - fontSize / 2 - padV, pillW, pillH, 4 * dpr);
    ctx.fill();

    // Pill border matching ring color
    ctx.strokeStyle = ring.color.replace(/[\d.]+\)$/, "0.4)");
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.roundRect(labelX - padH, labelY - fontSize / 2 - padV, pillW, pillH, 4 * dpr);
    ctx.stroke();

    // Label text
    ctx.fillStyle = ring.color.replace(/[\d.]+\)$/, "0.9)");
    ctx.textBaseline = "middle";
    ctx.fillText(ring.label, labelX, labelY);
  }

  ctx.restore();
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: [number, number][],
  classification: string | null,
) {
  if (trail.length < 2) return;

  const dpr = window.devicePixelRatio;
  const maxTrailLen = 2000;
  const startIdx = Math.max(0, trail.length - maxTrailLen);

  ctx.save();

  // Color based on classification
  let baseColor: string;
  switch (classification) {
    case "capture":
      baseColor = "239, 68, 68";   // red
      break;
    case "escape":
      baseColor = "16, 185, 129";  // green
      break;
    case "stable_orbit":
      baseColor = "59, 130, 246";  // blue
      break;
    default:
      baseColor = "0, 229, 255";   // cyan
  }

  // Draw trail segments with fading alpha
  for (let i = startIdx + 1; i < trail.length; i++) {
    const alpha = ((i - startIdx) / (trail.length - startIdx)) * 0.8 + 0.1;
    const width = ((i - startIdx) / (trail.length - startIdx)) * 2.5 * dpr + 0.5 * dpr;

    ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
    ctx.lineWidth = width;
    ctx.shadowColor = `rgba(${baseColor}, ${alpha * 0.6})`;
    ctx.shadowBlur = 4 * dpr;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1][0], trail[i - 1][1]);
    ctx.lineTo(trail[i][0], trail[i][1]);
    ctx.stroke();
  }

  ctx.restore();
}

function drawProbeHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  classification: string | null,
  time: number,
) {
  const dpr = window.devicePixelRatio;
  const pulse = 0.7 + 0.3 * Math.sin(time * 0.008);

  ctx.save();

  // Outer glow
  const glowRadius = 10 * dpr * pulse;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);

  let coreColor: string;
  let glowColor: string;
  switch (classification) {
    case "capture":
      coreColor = "#ff4444";
      glowColor = "rgba(255, 68, 68, 0.4)";
      break;
    case "escape":
      coreColor = "#10b981";
      glowColor = "rgba(16, 185, 129, 0.4)";
      break;
    case "stable_orbit":
      coreColor = "#3b82f6";
      glowColor = "rgba(59, 130, 246, 0.4)";
      break;
    default:
      coreColor = "#ffffff";
      glowColor = "rgba(0, 229, 255, 0.4)";
  }

  gradient.addColorStop(0, coreColor);
  gradient.addColorStop(0.5, glowColor);
  gradient.addColorStop(1, "transparent");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
  ctx.fill();

  // Core dot
  ctx.fillStyle = coreColor;
  ctx.shadowColor = coreColor;
  ctx.shadowBlur = 8 * dpr;
  ctx.beginPath();
  ctx.arc(x, y, 3 * dpr, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}

function drawStartIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleDeg: number,
) {
  const dpr = window.devicePixelRatio;
  const time = Date.now();
  const pulse = 0.6 + 0.4 * Math.sin(time * 0.004);

  ctx.save();

  // Pulsing ring
  ctx.strokeStyle = `rgba(0, 229, 255, ${0.5 * pulse})`;
  ctx.lineWidth = 1.5 * dpr;
  ctx.setLineDash([3 * dpr, 3 * dpr]);
  ctx.beginPath();
  ctx.arc(x, y, 12 * dpr, 0, 2 * Math.PI);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = `rgba(0, 229, 255, ${0.8 * pulse})`;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, 3 * dpr, 0, 2 * Math.PI);
  ctx.fill();

  // Velocity direction arrow
  // Probe is at phi=0 (right of center), so:
  //   0° (radial inward) → arrow points LEFT (π)
  //   90° (tangential)   → arrow points UP (-π/2)
  //   180° (radial out)  → arrow points RIGHT (0)
  const arrowAngle = (angleDeg * Math.PI) / 180 - Math.PI;
  const arrowLen = 20 * dpr;
  const ax = x + arrowLen * Math.cos(arrowAngle);
  const ay = y + arrowLen * Math.sin(arrowAngle);

  ctx.strokeStyle = `rgba(0, 229, 255, ${0.6 * pulse})`;
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ax, ay);
  ctx.stroke();

  // Arrowhead
  const headLen = 6 * dpr;
  ctx.fillStyle = `rgba(0, 229, 255, ${0.6 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(
    ax - headLen * Math.cos(arrowAngle - 0.4),
    ay - headLen * Math.sin(arrowAngle - 0.4),
  );
  ctx.lineTo(
    ax - headLen * Math.cos(arrowAngle + 0.4),
    ay - headLen * Math.sin(arrowAngle + 0.4),
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawClassificationBadge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  classification: string,
) {
  const dpr = window.devicePixelRatio;

  let icon: string;
  let label: string;
  let borderColor: string;
  let textColor: string;

  switch (classification) {
    case "capture":
      icon = "⚠";
      label = "CAPTURED";
      borderColor = "rgba(239, 68, 68, 0.6)";
      textColor = "#ff6b6b";
      break;
    case "escape":
      icon = "↗";
      label = "ESCAPED";
      borderColor = "rgba(16, 185, 129, 0.6)";
      textColor = "#34d399";
      break;
    case "stable_orbit":
      icon = "⟳";
      label = "STABLE ORBIT";
      borderColor = "rgba(59, 130, 246, 0.6)";
      textColor = "#60a5fa";
      break;
    default:
      return;
  }

  const text = `${icon} ${label}`;
  ctx.save();

  ctx.font = `bold ${13 * dpr}px "JetBrains Mono", monospace`;
  const metrics = ctx.measureText(text);
  const pw = 20 * dpr;
  const bw = metrics.width + pw * 2;
  const bh = 32 * dpr;
  const bx = (w - bw) / 2;
  // Position at bottom, 60px above the canvas edge
  const by = h - bh - 60 * dpr;

  // Solid dark background for readability against bright accretion glow
  ctx.fillStyle = "rgba(10, 10, 10, 0.92)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 12 * dpr;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8 * dpr);
  ctx.fill();

  // Colored border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5 * dpr;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8 * dpr);
  ctx.stroke();

  // Text
  ctx.fillStyle = textColor;
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 4 * dpr;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, by + bh / 2);

  ctx.restore();
}
