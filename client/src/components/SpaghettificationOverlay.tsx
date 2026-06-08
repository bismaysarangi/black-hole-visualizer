import { useRef, useEffect, useCallback } from "react";
import { useSimulationStore } from "../store/simulationStore";

/**
 * Spaghettification Visualizer
 *
 * Drops a circular cluster of particles toward the black hole.
 * Tidal forces stretch the cluster radially and compress it laterally.
 * Particles redshift as they approach the event horizon.
 * Particles vanish when they cross Rs = 1.
 */

// ── Particle type ────────────────────────────────────────────────────────────
interface TidalParticle {
  r: number;       // radial distance in Rs units
  phi: number;     // azimuthal angle (radians)
  dr: number;      // radial velocity
  dphi: number;    // angular velocity (lateral drift)
  alive: boolean;
  originalOffset: number; // offset from cluster center for tidal calc
}

// ── Physics constants ────────────────────────────────────────────────────────
// Schwarzschild free-fall radial acceleration: d²r/dτ² = -1/(2r²)
// Tidal acceleration (relative to center): Δa ≈ (1/r³) * Δr  (radial stretching)
// Lateral compression: Δa_lat ≈ -(1/(2r³)) * Δr_lat

function createParticleCluster(startR: number, count: number): TidalParticle[] {
  const particles: TidalParticle[] = [];
  const clusterRadius = 0.4; // Rs units

  // Create circular cluster
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const layerR = (Math.floor(i / 8) + 1) / (Math.ceil(count / 8)) * clusterRadius;
    const offsetR = layerR * Math.cos(angle);
    const offsetPhi = (layerR * Math.sin(angle)) / startR; // convert to angular offset

    particles.push({
      r: startR + offsetR,
      phi: 0 + offsetPhi,
      dr: 0,        // starts at rest, free-falling
      dphi: 0,
      alive: true,
      originalOffset: offsetR,
    });
  }

  // Add center particle
  particles.push({
    r: startR,
    phi: 0,
    dr: 0,
    dphi: 0,
    alive: true,
    originalOffset: 0,
  });

  return particles;
}

function stepTidalParticle(p: TidalParticle, dt: number): TidalParticle {
  if (!p.alive) return p;

  const r = p.r;
  const r2 = r * r;

  // Free-fall acceleration in Schwarzschild: d²r/dτ² = -1/(2r²)
  const accel = -1 / (2 * r2);

  // Simple Euler integration (good enough for visualization)
  const newDr = p.dr + accel * dt;
  const newR = p.r + newDr * dt;

  // Small angular drift for visual interest
  const newDphi = p.dphi + (Math.random() - 0.5) * 0.0002;
  const newPhi = p.phi + newDphi * dt;

  // Check horizon crossing
  const alive = newR > 1.0;

  return {
    ...p,
    r: Math.max(newR, 0.1),
    phi: newPhi,
    dr: newDr,
    dphi: newDphi,
    alive,
  };
}

// ── Gravitational redshift color ─────────────────────────────────────────────
function redshiftColor(r: number): string {
  // Gravitational redshift: λ_obs/λ_emit = 1/sqrt(1 - Rs/r)
  // Map to visual color: white → yellow → orange → red → dark red
  const factor = Math.sqrt(Math.max(1 - 1 / r, 0));
  // factor: 1 = no redshift (white), 0 = infinite redshift (black)

  if (factor > 0.8) {
    // White to light yellow
    const t = (factor - 0.8) / 0.2;
    return `rgb(255, ${Math.round(255 - 30 * (1 - t))}, ${Math.round(255 - 80 * (1 - t))})`;
  } else if (factor > 0.5) {
    // Yellow to orange
    const t = (factor - 0.5) / 0.3;
    return `rgb(255, ${Math.round(180 * t + 100 * (1 - t))}, ${Math.round(50 * t)})`;
  } else if (factor > 0.2) {
    // Orange to red
    const t = (factor - 0.2) / 0.3;
    return `rgb(${Math.round(255 * t + 180 * (1 - t))}, ${Math.round(100 * t + 20 * (1 - t))}, 0)`;
  } else {
    // Red to dark red/black
    const t = factor / 0.2;
    return `rgb(${Math.round(180 * t)}, ${Math.round(20 * t)}, 0)`;
  }
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function SpaghettificationOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<TidalParticle[]>([]);
  const animRef = useRef(0);
  const trailsRef = useRef<Map<number, [number, number][]>>(new Map());

  const {
    config,
    spaghettifyActive,
    spaghettifyDone,
    setSpaghettifyDone,
    probeConfig,
  } = useSimulationStore();

  // ── Coordinate mapping (same as SpacecraftOverlay) ──────────
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

  // ── Initialize particles when activated ────────────────────────
  useEffect(() => {
    if (spaghettifyActive && !spaghettifyDone) {
      particlesRef.current = createParticleCluster(probeConfig.startR, 48);
      trailsRef.current = new Map();
    }
  }, [spaghettifyActive, spaghettifyDone, probeConfig.startR]);

  // ── Animation loop ─────────────────────────────────────────────
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

    const DT = 0.06;
    const STEPS = 4;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const dpr = window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, w, h);

      const cx_canvas = w / 2;
      const cy_canvas = h / 2;
      const rs = getRsPixels(canvas);

      // Draw event horizon ring for reference
      ctx.save();
      ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
      ctx.lineWidth = 2 * dpr;
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.arc(cx_canvas, cy_canvas, rs, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      if (spaghettifyActive && !spaghettifyDone) {
        const particles = particlesRef.current;

        // Step physics
        for (let s = 0; s < STEPS; s++) {
          for (let i = 0; i < particles.length; i++) {
            particles[i] = stepTidalParticle(particles[i], DT);
          }
        }

        // Update trails
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (!p.alive) continue;

          const [sx, sy] = toScreen(p.r, p.phi, canvas);
          const trail = trailsRef.current.get(i) || [];
          trail.push([sx, sy]);
          if (trail.length > 60) trail.shift();
          trailsRef.current.set(i, trail);
        }

        // Check if all particles are dead
        const allDead = particles.every((p) => !p.alive);
        if (allDead) {
          setSpaghettifyDone(true);
        }
      }

      // Draw particle trails
      ctx.save();
      for (const [idx, trail] of trailsRef.current.entries()) {
        if (trail.length < 2) continue;
        const p = particlesRef.current[idx];
        if (!p) continue;

        const color = redshiftColor(p.r);

        for (let i = 1; i < trail.length; i++) {
          const alpha = (i / trail.length) * 0.4;
          ctx.strokeStyle = color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
          ctx.lineWidth = ((i / trail.length) * 2 + 0.5) * dpr;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1][0], trail[i - 1][1]);
          ctx.lineTo(trail[i][0], trail[i][1]);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Draw particles
      ctx.save();
      for (const p of particlesRef.current) {
        if (!p.alive) continue;

        const [sx, sy] = toScreen(p.r, p.phi, canvas);
        const color = redshiftColor(p.r);
        const size = Math.max(1.5, 3 - (1 / p.r) * 2) * dpr;

        // Glow
        const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
        glowGrad.addColorStop(0, color.replace("rgb", "rgba").replace(")", ", 0.6)"));
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4 * dpr;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // Draw start position indicator when not active
      if (!spaghettifyActive && !spaghettifyDone) {
        const [sx, sy] = toScreen(probeConfig.startR, 0, canvas);
        const time = Date.now();
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);

        ctx.save();
        // Cluster preview
        ctx.strokeStyle = `rgba(255, 200, 100, ${0.3 * pulse})`;
        ctx.lineWidth = 1.5 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.arc(sx, sy, 12 * dpr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner dots preview
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const dx = 6 * dpr * Math.cos(angle);
          const dy = 6 * dpr * Math.sin(angle);
          ctx.fillStyle = `rgba(255, 220, 150, ${0.5 * pulse})`;
          ctx.beginPath();
          ctx.arc(sx + dx, sy + dy, 1.5 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center dot
        ctx.fillStyle = `rgba(255, 220, 150, ${0.7 * pulse})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = `rgba(255, 200, 100, ${0.3 * pulse})`;
        ctx.font = `bold ${7 * dpr}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillText("DROP POINT", sx, sy + 20 * dpr);
        ctx.restore();
      }

      // Classification badge
      if (spaghettifyDone) {
        drawSpaghettifiedBadge(ctx, w, h, dpr, Date.now());
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [
    spaghettifyActive,
    spaghettifyDone,
    config.mass,
    probeConfig.startR,
    getRsPixels,
    toScreen,
    setSpaghettifyDone,
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

// ── Badge ────────────────────────────────────────────────────────────────────
function drawSpaghettifiedBadge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  time: number,
) {
  const glowPulse = 0.7 + 0.3 * Math.sin(time * 0.004);

  ctx.save();

  const label = "SPAGHETTIFIED";
  const subtitle = "Object destroyed by tidal forces";
  const borderColor = "rgba(245, 158, 11, 0.6)";
  const textColor = "#fbbf24";

  ctx.font = `bold ${14 * dpr}px "JetBrains Mono", monospace`;
  const metrics = ctx.measureText(`\u2715  ${label}`);
  ctx.font = `${9 * dpr}px "JetBrains Mono", monospace`;
  const subMetrics = ctx.measureText(subtitle);

  const pw = 24 * dpr;
  const bw = Math.max(metrics.width, subMetrics.width) + pw * 2;
  const bh = 48 * dpr;
  const bx = (w - bw) / 2;
  const by = h - bh - 60 * dpr;

  // Outer glow
  ctx.fillStyle = "rgba(245, 158, 11, 0.06)";
  ctx.shadowColor = borderColor;
  ctx.shadowBlur = 30 * dpr * glowPulse;
  ctx.beginPath();
  ctx.roundRect(bx - 4 * dpr, by - 4 * dpr, bw + 8 * dpr, bh + 8 * dpr, 12 * dpr);
  ctx.fill();

  // Background
  ctx.fillStyle = "rgba(5, 5, 10, 0.94)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 12 * dpr;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8 * dpr);
  ctx.fill();

  // Border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5 * dpr;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8 * dpr);
  ctx.stroke();

  // Scan line
  const scanY = by + ((time * 0.05) % bh);
  ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
  ctx.fillRect(bx, scanY, bw, 2 * dpr);

  // Title
  ctx.font = `bold ${14 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillStyle = textColor;
  ctx.shadowColor = textColor;
  ctx.shadowBlur = 8 * dpr;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`\u2715  ${label}`, w / 2, by + bh * 0.38);

  // Subtitle
  ctx.font = `${9 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 0.5;
  ctx.shadowBlur = 0;
  ctx.fillText(subtitle, w / 2, by + bh * 0.72);

  ctx.globalAlpha = 1;
  ctx.restore();
}
