import type { FullAnalysis, BlackHoleConfig } from "../types/blackhole";

/** Pure-JS physics fallback — runs when the API is unreachable (405 / network error). */
export function computeLocalAnalysis(config: BlackHoleConfig): FullAnalysis {
  const { mass, spin, inclination } = config;

  // Schwarzschild radius (km) — used as our unit
  const Rs = mass * 2.95;

  // Lensing
  const photon_sphere_radius = 1.5 * Rs;
  const shadow_radius = ((3 * Math.sqrt(3)) / 2) * Rs;
  const einstein_radius = Math.sqrt(2 * Rs);
  const b_min = shadow_radius;
  const deflection_angle_rad = Math.PI + 2 * Math.log(b_min / Rs);
  const deflection_angle = (deflection_angle_rad * 180) / Math.PI;

  // Time dilation at 5 Rs
  const r_observer = 5.0;
  const time_factor = Math.sqrt(1 - 1 / r_observer);
  const proper_time_ratio = 1 / time_factor;

  // Doppler
  const G = 6.674e-11;
  const C = 3e8;
  const M_SUN = 1.989e30;
  const r_m = (r_observer * (2 * G * mass * M_SUN)) / (C * C);
  const v = Math.sqrt((G * mass * M_SUN) / r_m) / C;
  const beta = v * Math.sin((inclination * Math.PI) / 180);
  const betaC = Math.max(-0.999, Math.min(0.999, beta));
  const approaching_factor = Math.sqrt((1 + betaC) / (1 - betaC));

  // Minimal ray stubs (no real trace, just placeholders)
  const rays = Array.from({ length: 5 }, (_, i) => ({
    ray_id: i,
    points: [[20 - i * 2, i * 0.5]] as [number, number][],
    deflected: i > 1,
    captured: i === 0,
  }));

  return {
    lensing: {
      einstein_radius: +einstein_radius.toFixed(4),
      deflection_angle: +deflection_angle.toFixed(4),
      photon_sphere_radius: +photon_sphere_radius.toFixed(4),
      shadow_radius: +shadow_radius.toFixed(4),
    },
    time_dilation: {
      r_observer: r_observer,
      time_factor: +time_factor.toFixed(6),
      proper_time_ratio: +proper_time_ratio.toFixed(6),
    },
    doppler: {
      approaching_factor: +approaching_factor.toFixed(4),
      receding_factor: +(1 / approaching_factor).toFixed(4),
    },
    rays,
    config,
  };
}
