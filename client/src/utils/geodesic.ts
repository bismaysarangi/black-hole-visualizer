/**
 * Schwarzschild geodesic integrator — RK4 in (r, φ) coordinates.
 *
 * Uses the effective potential formalism for a massive test particle
 * orbiting a Schwarzschild black hole.  All lengths are in units of
 * the Schwarzschild radius Rs.
 */

import type { OrbitClassification } from "../types/blackhole";

// ── State ────────────────────────────────────────────────────────────────────

export interface GeodesicState {
  r: number;        // radial coordinate in Rs units
  phi: number;      // azimuthal angle (radians)
  dr: number;       // dr/dτ
  dphi: number;     // dφ/dτ
  tau: number;      // proper time elapsed
  classification: OrbitClassification;
  totalPhi: number; // accumulated angle (can exceed 2π)
}

// ── Init ─────────────────────────────────────────────────────────────────────

/**
 * Build the initial geodesic state from user-facing parameters.
 *
 * @param startR   Starting radius in Rs units (e.g. 10)
 * @param angleDeg Velocity angle: 0°=radial inward, 90°=tangential, 180°=radial outward
 * @param speed    Speed as fraction of c (0..~0.5)
 */
export function initGeodesic(
  startR: number,
  angleDeg: number,
  speed: number,
): GeodesicState {
  const r0 = Math.max(startR, 1.05); // clamp outside horizon
  const angleRad = (angleDeg * Math.PI) / 180;

  // Metric factor at r0 (in Rs units, Rs=1 internally)
  // f(r) = 1 - 1/r  (where r is in Rs units)
  const f = 1 - 1 / r0;

  // Velocity components in the local rest frame
  // v_r = speed * cos(angle - π) = -speed * cos(angle)
  //   angle=0 → radial inward (v_r < 0)
  //   angle=90 → tangential (v_r = 0)
  //   angle=180 → radial outward (v_r > 0)
  const v_r = -speed * Math.cos(angleRad);       // radial
  const v_phi = speed * Math.sin(angleRad);       // tangential

  // Lorentz factor
  const gamma = 1 / Math.sqrt(Math.max(1 - speed * speed, 1e-12));

  // Conserved specific energy: E/mc² = γ √f
  const E = gamma * Math.sqrt(Math.max(f, 1e-12));

  // Conserved specific angular momentum: L/(mc Rs) = γ r v_φ
  const L = gamma * r0 * v_phi;

  // Coordinate velocities (per unit proper time)
  // dr/dτ = (E * v_r) / f  — derived from the metric
  const dr = (E * v_r) / Math.max(f, 1e-12);

  // dφ/dτ = L / r²
  const dphi = L / (r0 * r0);

  return {
    r: r0,
    phi: 0,
    dr,
    dphi,
    tau: 0,
    classification: "pending",
    totalPhi: 0,
  };
}

// ── RK4 step ─────────────────────────────────────────────────────────────────

interface Derivs {
  dr: number;
  dphi: number;
  ddr: number;
  ddphi: number;
}

/**
 * Geodesic equation RHS.
 *
 * For a massive particle in Schwarzschild spacetime (Rs = 1):
 *   d²r/dτ² = -½ f'(r) (E²/f²) + ½ f'(r) + L² (r - 3/2) / r⁴
 *   where f(r) = 1 - 1/r,  f'(r) = 1/r²
 *
 * Simplified from the Christoffel-symbol equations.
 */
function derivatives(
  r: number,
  _phi: number,
  dr: number,
  dphi: number,
): Derivs {
  const r2 = r * r;
  const r3 = r2 * r;
  const r4 = r3 * r;

  // Schwarzschild metric function and derivative (Rs=1)
  // f  = 1 - 1/r
  // f' = 1/r²

  // Geodesic acceleration using the effective potential approach:
  // d²r/dτ² = -1/(2r²) + L²(r-3/2)/r⁴   (for timelike geodesics)
  // But more accurately from the full geodesic equations:
  //
  // d²r/dτ² = -1/(2r²) * (dt/dτ)² + 1/(2r²(1-1/r)²) * dr² + r(1-1/r)(dφ/dτ)²
  //                              ... which simplifies via constants of motion to:
  //
  // d²r/dτ² = -(1)/(2r²) + (dr²)/(2r(r-1)) + (r - 1) * dphi² - (dphi² * 1)/(r)
  //
  // Using the standard form with E, L approach:

  const L2 = (r2 * dphi) * (r2 * dphi) / (r2); // L = r² dφ/dτ → L² = r²(dφ/dτ)²  — no, L = r²dφ/dτ
  // Actually let's directly use Christoffel symbol form:
  // d²r/dτ² = -(M/r²)(1-2M/r)(dt/dτ)² + (M/r²)/(1-2M/r) (dr/dτ)² + r(1-2M/r)(dφ/dτ)²
  // With Rs=1, M = 1/2:
  // d²r/dτ² = -(1/(2r²))(1-1/r)(dt/dτ)² + (1/(2r²))/(1-1/r) dr² + r(1-1/r) dφ²

  // We need dt/dτ.  From E = (1-1/r) dt/dτ  →  dt/dτ = E / (1-1/r)
  // And E² = (1-1/r)[ 1 + (dr/dτ)²/(1-1/r) + r² (dφ/dτ)² ]  ... actually
  // Let's use the simpler effective-potential formulation directly.

  // From the radial equation:
  // (dr/dτ)² = E² - V_eff(r)
  // where V_eff(r) = (1 - 1/r)(1 + L²/r²)
  //
  // Differentiating:
  // 2(dr/dτ)(d²r/dτ²) = -dV_eff/dr
  // d²r/dτ² = -(1/2) dV_eff/dr
  //
  // dV_eff/dr = (1/r²)(1 + L²/r²) + (1-1/r)(-2L²/r³)
  //           = 1/r² + L²/r⁴ - 2L²/r³ + 2L²/r⁴
  //           = 1/r² + 3L²/r⁴ - 2L²/r³
  //           = 1/r² - 2L²(r - 3/2)/r⁴    ... let me redo this

  // V_eff = (1-1/r)(1 + L²/r²) = 1 + L²/r² - 1/r - L²/r³
  // dV_eff/dr = -2L²/r³ + 1/r² + 3L²/r⁴
  //
  // So: d²r/dτ² = -(1/2)[1/r² - 2L²/r³ + 3L²/r⁴]
  //             = -1/(2r²) + L²/r³ - 3L²/(2r⁴)

  // Compute angular momentum from current state
  const L = r2 * dphi;
  const Lsq = L * L;

  const ddr = -1 / (2 * r2) + Lsq / r3 - (3 * Lsq) / (2 * r4);

  // dφ/dτ = L/r² (L is conserved)
  const ddphi = -2 * dr * dphi / r; // from d/dτ(r²dφ/dτ) = 0 → ddphi = -2(dr/dτ)(dφ/dτ)/r

  return { dr, dphi, ddr, ddphi };
}

/**
 * Advance the geodesic by one RK4 step.
 */
export function stepGeodesic(
  state: GeodesicState,
  dt: number,
): GeodesicState {
  if (state.classification !== "pending") return state;

  const { r, phi, dr: vr, dphi: vphi } = state;

  // RK4
  const k1 = derivatives(r, phi, vr, vphi);
  const k2 = derivatives(
    r + 0.5 * dt * k1.dr,
    phi + 0.5 * dt * k1.dphi,
    vr + 0.5 * dt * k1.ddr,
    vphi + 0.5 * dt * k1.ddphi,
  );
  const k3 = derivatives(
    r + 0.5 * dt * k2.dr,
    phi + 0.5 * dt * k2.dphi,
    vr + 0.5 * dt * k2.ddr,
    vphi + 0.5 * dt * k2.ddphi,
  );
  const k4 = derivatives(
    r + dt * k3.dr,
    phi + dt * k3.dphi,
    vr + dt * k3.ddr,
    vphi + dt * k3.ddphi,
  );

  const newR = r + (dt / 6) * (k1.dr + 2 * k2.dr + 2 * k3.dr + k4.dr);
  const newPhi = phi + (dt / 6) * (k1.dphi + 2 * k2.dphi + 2 * k3.dphi + k4.dphi);
  const newVr = vr + (dt / 6) * (k1.ddr + 2 * k2.ddr + 2 * k3.ddr + k4.ddr);
  const newVphi = vphi + (dt / 6) * (k1.ddphi + 2 * k2.ddphi + 2 * k3.ddphi + k4.ddphi);
  const newTotalPhi = state.totalPhi + Math.abs(newPhi - phi);

  // ── Classification ───────────────────────────────────────────────
  let classification: OrbitClassification = "pending";

  if (newR <= 1.0) {
    // Crossed event horizon
    classification = "capture";
  } else if (newR > 50) {
    // Escaped to large radius
    classification = "escape";
  } else if (newTotalPhi >= 4 * Math.PI) {
    // Two full orbits without capture/escape → stable
    classification = "stable_orbit";
  }

  return {
    r: Math.max(newR, 0.01), // clamp so we don't get NaN
    phi: newPhi,
    dr: newVr,
    dphi: newVphi,
    tau: state.tau + dt,
    classification,
    totalPhi: newTotalPhi,
  };
}
