import { useRef, useEffect, useCallback } from "react";
import { useSimulationStore } from "../store/simulationStore";
import { initGeodesic, stepGeodesic, type GeodesicState } from "../utils/geodesic";

// ── Particle system for engine thrust / explosion effects ────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "thrust" | "explosion" | "spark";
}

function createThrustParticles(x: number, y: number, dx: number, dy: number, dpr: number): Particle[] {
  const particles: Particle[] = [];
  // Only emit 1 particle per call to reduce load
  const spread = (Math.random() - 0.5) * 3 * dpr;
  const speed = (0.5 + Math.random() * 1.5) * dpr;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  particles.push({
    x: x + spread,
    y: y + spread,
    vx: (-dx / len) * speed + (Math.random() - 0.5) * dpr,
    vy: (-dy / len) * speed + (Math.random() - 0.5) * dpr,
    life: 1,
    maxLife: 0.4 + Math.random() * 0.4,
    size: (1.5 + Math.random() * 2) * dpr,
    color: Math.random() > 0.5 ? "0, 229, 255" : "100, 200, 255",
    type: "thrust",
  });
  return particles;
}

function createExplosionParticles(x: number, y: number, color: string, dpr: number): Particle[] {
  const particles: Particle[] = [];
  const count = 12 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (2 + Math.random() * 5) * dpr;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.5 + Math.random() * 1,
      size: (1 + Math.random() * 3) * dpr,
      color,
      type: "explosion",
    });
  }
  return particles;
}

/**
 * 2D canvas overlay that draws the spacecraft probe trajectory
 * over the WebGL black-hole visualization.
 */
export default function SpacecraftOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geodesicRef = useRef<GeodesicState | null>(null);
  const animIdRef = useRef(0);
  const trailRef = useRef<[number, number][]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const explosionFiredRef = useRef(false);
  const prevClassificationRef = useRef<string | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stepCountRef = useRef(0);

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
  const getRsPixels = useCallback(
    (canvas: HTMLCanvasElement) => {
      const massNorm =
        Math.log10(config.mass + 1) / Math.log10(1e7 + 1);
      const rsUV = 0.07 + massNorm * 0.06;
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
        cy - r * rs * Math.sin(phi),
      ];
    },
    [getRsPixels],
  );

  // ── Reset when probe is deactivated or config changes ──────────
  useEffect(() => {
    if (!probeActive) {
      geodesicRef.current = null;
      trailRef.current = [];
      particlesRef.current = [];
      explosionFiredRef.current = false;
    }
  }, [probeActive]);

  // ── Detect classification changes for explosion effects ────────
  useEffect(() => {
    if (probeClassification !== prevClassificationRef.current) {
      prevClassificationRef.current = probeClassification;
      if (probeClassification === "capture" || probeClassification === "escape" || probeClassification === "stable_orbit") {
        explosionFiredRef.current = false; // allow explosion on next frame
      }
    }
  }, [probeClassification]);

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
      // Invalidate cached grid
      gridCanvasRef.current = null;
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
      const dpr = window.devicePixelRatio;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const rs = getRsPixels(canvas);

      // Always draw reference rings when probe tab is visible
      drawReferenceRings(ctx, cx, cy, rs);

      // Draw HUD grid overlay (cached to offscreen canvas)
      if (!gridCanvasRef.current || gridCanvasRef.current.width !== w || gridCanvasRef.current.height !== h) {
        const offscreen = document.createElement("canvas");
        offscreen.width = w;
        offscreen.height = h;
        const offCtx = offscreen.getContext("2d");
        if (offCtx) {
          drawHUDGrid(offCtx, w, h, dpr);
        }
        gridCanvasRef.current = offscreen;
      }
      ctx.drawImage(gridCanvasRef.current, 0, 0);

      // If probe is active, step the physics and draw
      if (probeActive && probeClassification !== "capture" && probeClassification !== "escape" && probeClassification !== "stable_orbit") {
        if (!geodesicRef.current) {
          geodesicRef.current = initGeodesic(
            probeConfig.startR,
            probeConfig.angle,
            probeConfig.speed,
          );
          trailRef.current = [];
          particlesRef.current = [];
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
          
          // Create thrust particles — only every 3rd step to reduce load
          stepCountRef.current++;
          const trail = trailRef.current;
          if (trail.length > 0 && stepCountRef.current % 3 === 0) {
            const [px, py] = trail[trail.length - 1];
            particlesRef.current.push(
              ...createThrustParticles(px, py, sx - px, sy - py, dpr)
            );
          }
          
          trailRef.current.push([sx, sy]);
          appendProbePoint([sx, sy]);

          if (geodesicRef.current.classification !== "pending") {
            setProbeClassification(geodesicRef.current.classification);
            break;
          }
        }
      }

      // Fire explosion particles on classification
      if (!explosionFiredRef.current && trailRef.current.length > 0) {
        const [hx, hy] = trailRef.current[trailRef.current.length - 1];
        if (probeClassification === "capture") {
          particlesRef.current.push(...createExplosionParticles(hx, hy, "239, 68, 68", dpr));
          explosionFiredRef.current = true;
        } else if (probeClassification === "escape") {
          particlesRef.current.push(...createExplosionParticles(hx, hy, "16, 185, 129", dpr));
          explosionFiredRef.current = true;
        } else if (probeClassification === "stable_orbit") {
          particlesRef.current.push(...createExplosionParticles(hx, hy, "59, 130, 246", dpr));
          explosionFiredRef.current = true;
        }
      }

      // Update and draw particles
      updateAndDrawParticles(ctx, particlesRef.current, dpr);

      // Draw trail
      const trail = trailRef.current;
      if (trail.length > 1) {
        drawTrail(ctx, trail, probeClassification);
      }

      // Draw probe head
      if (trail.length > 0) {
        const [hx, hy] = trail[trail.length - 1];
        drawProbeHead(ctx, hx, hy, probeClassification, Date.now(), dpr);
        
        // Draw HUD info near probe
        if (geodesicRef.current) {
          drawProbeHUD(ctx, hx, hy, geodesicRef.current, dpr);
        }
      }

      // Draw start position indicator (before launch)
      if (!probeActive && !probeClassification) {
        const [sx, sy] = toScreen(probeConfig.startR, 0, canvas);
        drawStartIndicator(ctx, sx, sy, probeConfig.angle, dpr);
      }

      // Draw classification badge
      if (probeClassification && probeClassification !== "pending") {
        drawClassificationBadge(ctx, w, h, probeClassification, Date.now());
      }

      // Draw corner HUD elements
      drawCornerHUD(ctx, w, h, dpr, probeActive, probeClassification);

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

function drawHUDGrid(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(0, 229, 255, 0.03)";
  ctx.lineWidth = 0.5 * dpr;

  // Subtle grid
  const spacing = 80 * dpr;
  for (let x = spacing; x < w; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = spacing; y < h; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Corner brackets
  const bracketSize = 30 * dpr;
  const margin = 20 * dpr;
  ctx.strokeStyle = "rgba(0, 229, 255, 0.12)";
  ctx.lineWidth = 1.5 * dpr;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(margin, margin + bracketSize);
  ctx.lineTo(margin, margin);
  ctx.lineTo(margin + bracketSize, margin);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(w - margin - bracketSize, margin);
  ctx.lineTo(w - margin, margin);
  ctx.lineTo(w - margin, margin + bracketSize);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(margin, h - margin - bracketSize);
  ctx.lineTo(margin, h - margin);
  ctx.lineTo(margin + bracketSize, h - margin);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(w - margin - bracketSize, h - margin);
  ctx.lineTo(w - margin, h - margin);
  ctx.lineTo(w - margin, h - margin - bracketSize);
  ctx.stroke();

  ctx.restore();
}

function drawCornerHUD(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, probeActive: boolean, classification: string | null) {
  ctx.save();
  const fontSize = 8 * dpr;
  ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
  ctx.textBaseline = "top";

  // Top-right telemetry readout
  const x = w - 30 * dpr;
  const y = 35 * dpr;

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(0, 229, 255, 0.35)";
  const time = new Date();
  ctx.fillText(`SYS ${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}:${time.getSeconds().toString().padStart(2, "0")}`, x, y);
  ctx.fillText(`FRM ${Math.floor(performance.now() / 16.67).toString().padStart(6, "0")}`, x, y + fontSize * 1.5);

  if (probeActive) {
    ctx.fillStyle = classification === "pending" ? "rgba(245, 158, 11, 0.5)" : "rgba(0, 229, 255, 0.5)";
    ctx.fillText("● TRACKING", x, y + fontSize * 3);
  }

  ctx.restore();
}

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

    // Outer glow ring
    ctx.strokeStyle = ring.color.replace(/[\d.]+\)$/, "0.15)");
    ctx.lineWidth = 6 * dpr;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw ring circle
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash(ring.dash);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Distance markers at cardinal points
    const markerPositions = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    ctx.setLineDash([]);
    for (const angle of markerPositions) {
      const mx = cx + radius * Math.cos(angle);
      const my = cy - radius * Math.sin(angle);
      ctx.fillStyle = ring.color.replace(/[\d.]+\)$/, "0.4)");
      ctx.beginPath();
      ctx.arc(mx, my, 2 * dpr, 0, 2 * Math.PI);
      ctx.fill();
    }

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
      baseColor = "239, 68, 68";
      break;
    case "escape":
      baseColor = "16, 185, 129";
      break;
    case "stable_orbit":
      baseColor = "59, 130, 246";
      break;
    default:
      baseColor = "0, 229, 255";
  }

  // Draw outer glow pass
  for (let i = startIdx + 1; i < trail.length; i++) {
    const t = (i - startIdx) / (trail.length - startIdx);
    const alpha = t * 0.15;
    const width = t * 8 * dpr + 2 * dpr;

    ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1][0], trail[i - 1][1]);
    ctx.lineTo(trail[i][0], trail[i][1]);
    ctx.stroke();
  }

  // Draw trail segments with fading alpha
  for (let i = startIdx + 1; i < trail.length; i++) {
    const t = (i - startIdx) / (trail.length - startIdx);
    const alpha = t * 0.85 + 0.1;
    const width = t * 2.5 * dpr + 0.5 * dpr;

    ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
    ctx.lineWidth = width;
    ctx.shadowColor = `rgba(${baseColor}, ${alpha * 0.8})`;
    ctx.shadowBlur = 6 * dpr;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1][0], trail[i - 1][1]);
    ctx.lineTo(trail[i][0], trail[i][1]);
    ctx.stroke();
  }

  // Draw dotted "heartbeat" marks every N points
  ctx.shadowBlur = 0;
  const markInterval = 40;
  for (let i = startIdx + markInterval; i < trail.length; i += markInterval) {
    const t = (i - startIdx) / (trail.length - startIdx);
    ctx.fillStyle = `rgba(${baseColor}, ${t * 0.6})`;
    ctx.beginPath();
    ctx.arc(trail[i][0], trail[i][1], 1.5 * dpr, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.restore();
}

function updateAndDrawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], dpr: number) {
  ctx.save();

  // Update particles
  const dt = 1 / 60;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt / p.maxLife;
  }

  // Single-pass filter to remove dead particles (much faster than splice-in-loop)
  const alive = particles.filter(p => p.life > 0);
  particles.length = 0;
  particles.push(...alive);

  // Draw surviving particles
  for (const p of particles) {
    const alpha = p.life * (p.type === "thrust" ? 0.6 : 0.8);
    ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
    ctx.shadowColor = `rgba(${p.color}, ${alpha * 0.5})`;
    ctx.shadowBlur = p.type === "explosion" ? 8 * dpr : 4 * dpr;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Cap particle count
  if (particles.length > 200) {
    particles.splice(0, particles.length - 200);
  }

  ctx.restore();
}

function drawProbeHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  classification: string | null,
  time: number,
  dpr: number,
) {
  const pulse = 0.7 + 0.3 * Math.sin(time * 0.008);
  const pulse2 = 0.5 + 0.5 * Math.sin(time * 0.012);

  ctx.save();

  let coreColor: string;
  let glowColor: string;
  let outerRing: string;
  switch (classification) {
    case "capture":
      coreColor = "#ff4444";
      glowColor = "rgba(255, 68, 68, 0.5)";
      outerRing = "rgba(255, 68, 68, 0.3)";
      break;
    case "escape":
      coreColor = "#10b981";
      glowColor = "rgba(16, 185, 129, 0.5)";
      outerRing = "rgba(16, 185, 129, 0.3)";
      break;
    case "stable_orbit":
      coreColor = "#3b82f6";
      glowColor = "rgba(59, 130, 246, 0.5)";
      outerRing = "rgba(59, 130, 246, 0.3)";
      break;
    default:
      coreColor = "#00e5ff";
      glowColor = "rgba(0, 229, 255, 0.5)";
      outerRing = "rgba(0, 229, 255, 0.3)";
  }

  // Outer scanning ring
  const scanRadius = 18 * dpr * pulse2;
  ctx.strokeStyle = outerRing;
  ctx.lineWidth = 1 * dpr;
  ctx.setLineDash([3 * dpr, 3 * dpr]);
  ctx.beginPath();
  ctx.arc(x, y, scanRadius, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crosshair lines
  const crossSize = 12 * dpr * pulse;
  ctx.strokeStyle = `rgba(0, 229, 255, ${0.2 * pulse})`;
  ctx.lineWidth = 0.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(x - crossSize, y);
  ctx.lineTo(x - 5 * dpr, y);
  ctx.moveTo(x + 5 * dpr, y);
  ctx.lineTo(x + crossSize, y);
  ctx.moveTo(x, y - crossSize);
  ctx.lineTo(x, y - 5 * dpr);
  ctx.moveTo(x, y + 5 * dpr);
  ctx.lineTo(x, y + crossSize);
  ctx.stroke();

  // Outer glow
  const glowRadius = 12 * dpr * pulse;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  gradient.addColorStop(0, coreColor);
  gradient.addColorStop(0.4, glowColor);
  gradient.addColorStop(1, "transparent");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
  ctx.fill();

  // Core dot
  ctx.fillStyle = coreColor;
  ctx.shadowColor = coreColor;
  ctx.shadowBlur = 12 * dpr;
  ctx.beginPath();
  ctx.arc(x, y, 3.5 * dpr, 0, 2 * Math.PI);
  ctx.fill();

  // Inner bright core
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x, y, 1.5 * dpr, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}

function drawProbeHUD(ctx: CanvasRenderingContext2D, x: number, y: number, state: GeodesicState, dpr: number) {
  ctx.save();

  const fontSize = 8 * dpr;
  ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const offsetX = 22 * dpr;
  const offsetY = -20 * dpr;
  const lineHeight = fontSize * 1.4;

  // Background
  const lines = [
    `R: ${state.r.toFixed(2)} Rs`,
    `φ: ${((state.phi * 180 / Math.PI) % 360).toFixed(1)}°`,
    `τ: ${state.tau.toFixed(1)}`,
  ];

  const maxWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
  const padding = 4 * dpr;

  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.beginPath();
  ctx.roundRect(
    x + offsetX - padding,
    y + offsetY - padding,
    maxWidth + padding * 2,
    lines.length * lineHeight + padding * 2,
    3 * dpr,
  );
  ctx.fill();

  ctx.strokeStyle = "rgba(0, 229, 255, 0.2)";
  ctx.lineWidth = 0.5 * dpr;
  ctx.beginPath();
  ctx.roundRect(
    x + offsetX - padding,
    y + offsetY - padding,
    maxWidth + padding * 2,
    lines.length * lineHeight + padding * 2,
    3 * dpr,
  );
  ctx.stroke();

  // Connector line
  ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
  ctx.lineWidth = 0.5 * dpr;
  ctx.setLineDash([2 * dpr, 2 * dpr]);
  ctx.beginPath();
  ctx.moveTo(x + 6 * dpr, y);
  ctx.lineTo(x + offsetX - padding, y + offsetY + (lines.length * lineHeight) / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Text
  ctx.fillStyle = "rgba(0, 229, 255, 0.7)";
  lines.forEach((line, i) => {
    ctx.fillText(line, x + offsetX, y + offsetY + i * lineHeight);
  });

  ctx.restore();
}

function drawStartIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleDeg: number,
  dpr: number,
) {
  const time = Date.now();
  const pulse = 0.6 + 0.4 * Math.sin(time * 0.004);
  const rotation = (time * 0.001) % (2 * Math.PI);

  ctx.save();

  // Rotating outer ring
  ctx.strokeStyle = `rgba(0, 229, 255, ${0.3 * pulse})`;
  ctx.lineWidth = 1 * dpr;
  ctx.setLineDash([8 * dpr, 4 * dpr]);
  ctx.beginPath();
  ctx.arc(x, y, 16 * dpr, rotation, rotation + Math.PI * 1.5);
  ctx.stroke();

  // Inner pulsing ring
  ctx.strokeStyle = `rgba(0, 229, 255, ${0.5 * pulse})`;
  ctx.lineWidth = 1.5 * dpr;
  ctx.setLineDash([3 * dpr, 3 * dpr]);
  ctx.beginPath();
  ctx.arc(x, y, 10 * dpr, 0, 2 * Math.PI);
  ctx.stroke();

  // Center dot with glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8 * dpr);
  gradient.addColorStop(0, `rgba(0, 229, 255, ${0.8 * pulse})`);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, 8 * dpr, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = `rgba(0, 229, 255, ${0.9 * pulse})`;
  ctx.beginPath();
  ctx.arc(x, y, 3 * dpr, 0, 2 * Math.PI);
  ctx.fill();

  // Velocity direction arrow
  const arrowAngle = (angleDeg * Math.PI) / 180 - Math.PI;
  const arrowLen = 24 * dpr;
  const ax = x + arrowLen * Math.cos(arrowAngle);
  const ay = y + arrowLen * Math.sin(arrowAngle);

  ctx.strokeStyle = `rgba(0, 229, 255, ${0.6 * pulse})`;
  ctx.lineWidth = 2 * dpr;
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 6 * dpr;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ax, ay);
  ctx.stroke();

  // Arrowhead
  const headLen = 7 * dpr;
  ctx.fillStyle = `rgba(0, 229, 255, ${0.7 * pulse})`;
  ctx.shadowBlur = 0;
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

  // "LAUNCH POINT" label
  ctx.font = `bold ${7 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillStyle = `rgba(0, 229, 255, ${0.4 * pulse})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("LAUNCH POINT", x, y + 22 * dpr);

  ctx.restore();
}

function drawClassificationBadge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  classification: string,
  time: number,
) {
  const dpr = window.devicePixelRatio;

  let icon: string;
  let label: string;
  let subtitle: string;
  let borderColor: string;
  let textColor: string;
  let bgGlow: string;

  switch (classification) {
    case "capture":
      icon = "✕";
      label = "PROBE DESTROYED";
      subtitle = "Crossed event horizon — no return";
      borderColor = "rgba(239, 68, 68, 0.6)";
      textColor = "#ff6b6b";
      bgGlow = "rgba(239, 68, 68, 0.08)";
      break;
    case "escape":
      icon = "↗";
      label = "ESCAPE SUCCESSFUL";
      subtitle = "Probe has achieved escape velocity";
      borderColor = "rgba(16, 185, 129, 0.6)";
      textColor = "#34d399";
      bgGlow = "rgba(16, 185, 129, 0.08)";
      break;
    case "stable_orbit":
      icon = "⟳";
      label = "ORBIT ESTABLISHED";
      subtitle = "Stable trajectory confirmed";
      borderColor = "rgba(59, 130, 246, 0.6)";
      textColor = "#60a5fa";
      bgGlow = "rgba(59, 130, 246, 0.08)";
      break;
    default:
      return;
  }

  const entryPulse = Math.min(1, (time % 3000) / 300); // fade in over 300ms
  const glowPulse = 0.7 + 0.3 * Math.sin(time * 0.004);

  const text = `${icon}  ${label}`;
  ctx.save();

  ctx.font = `bold ${14 * dpr}px "JetBrains Mono", monospace`;
  const metrics = ctx.measureText(text);
  ctx.font = `${9 * dpr}px "JetBrains Mono", monospace`;
  const subMetrics = ctx.measureText(subtitle);

  const pw = 24 * dpr;
  const bw = Math.max(metrics.width, subMetrics.width) + pw * 2;
  const bh = 48 * dpr;
  const bx = (w - bw) / 2;
  const by = h - bh - 60 * dpr;

  // Outer glow
  ctx.fillStyle = bgGlow;
  ctx.shadowColor = borderColor;
  ctx.shadowBlur = 30 * dpr * glowPulse;
  ctx.beginPath();
  ctx.roundRect(bx - 4 * dpr, by - 4 * dpr, bw + 8 * dpr, bh + 8 * dpr, 12 * dpr);
  ctx.fill();

  // Solid dark background
  ctx.fillStyle = "rgba(5, 5, 10, 0.94)";
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

  // Scan line effect across badge
  const scanY = by + ((time * 0.05) % bh);
  ctx.fillStyle = borderColor.replace(/[\d.]+\)$/, "0.1)");
  ctx.fillRect(bx, scanY, bw, 2 * dpr);

  // Title text
  ctx.font = `bold ${14 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillStyle = textColor;
  ctx.globalAlpha = entryPulse;
  ctx.shadowColor = textColor;
  ctx.shadowBlur = 8 * dpr;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, by + bh * 0.38);

  // Subtitle
  ctx.font = `${9 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillStyle = textColor;
  ctx.globalAlpha = entryPulse * 0.5;
  ctx.shadowBlur = 0;
  ctx.fillText(subtitle, w / 2, by + bh * 0.72);

  ctx.globalAlpha = 1;
  ctx.restore();
}
