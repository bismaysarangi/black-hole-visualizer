import numpy as np
from scipy.integrate import solve_ivp
from models.blackhole import BlackHoleConfig, LensingResult, TimeDilationResult, RayPath
from typing import List

# Constants
G  = 6.674e-11   # gravitational constant
C  = 3e8         # speed of light
M_SUN = 1.989e30 # solar mass in kg

def schwarzschild_radius(mass_solar: float) -> float:
    """Rs = 2GM/c² — the event horizon radius in meters"""
    M = mass_solar * M_SUN
    return (2 * G * M) / (C ** 2)

def compute_lensing(config: BlackHoleConfig) -> LensingResult:
    """
    Compute key lensing radii from Schwarzschild metric.
    All radii returned in units of Schwarzschild radius (Rs).
    """
    Rs = schwarzschild_radius(config.mass)

    # Photon sphere — closest stable circular orbit for light
    photon_sphere_radius = 1.5 * Rs

    # Black hole shadow radius (what observer sees)
    shadow_radius = (3 * np.sqrt(3) / 2) * Rs

    # Einstein ring radius for a source directly behind (in Rs units)
    # Simplified: theta_E ≈ sqrt(4GM * Dls / (c² * Ds * Dl))
    # We use normalized units for the visualizer
    einstein_radius = np.sqrt(2 * Rs)  # normalized for visualization

    # Maximum deflection angle near photon sphere (radians)
    # For impact parameter b slightly > 3√3/2 * Rs
    b_min = (3 * np.sqrt(3) / 2) * Rs
    deflection_angle = float(np.pi + 2 * np.log(b_min / Rs))

    return LensingResult(
        einstein_radius=round(einstein_radius, 4),
        deflection_angle=round(float(np.degrees(deflection_angle)), 4),
        photon_sphere_radius=round(photon_sphere_radius, 4),
        shadow_radius=round(shadow_radius, 4),
    )

def compute_time_dilation(config: BlackHoleConfig, r_observer_rs: float) -> TimeDilationResult:
    """
    Gravitational time dilation from Schwarzschild metric.
    dτ/dt = sqrt(1 - Rs/r)
    r_observer_rs: observer distance in units of Schwarzschild radii
    """
    Rs = schwarzschild_radius(config.mass)
    r  = r_observer_rs * Rs

    if r <= Rs:
        # Inside event horizon — time stops
        return TimeDilationResult(
            r_observer=r_observer_rs,
            time_factor=0.0,
            proper_time_ratio=0.0
        )

    time_factor       = float(np.sqrt(1 - (Rs / r)))
    proper_time_ratio = float(1 / time_factor) if time_factor > 0 else float('inf')

    return TimeDilationResult(
        r_observer=round(r_observer_rs, 4),
        time_factor=round(time_factor, 6),
        proper_time_ratio=round(proper_time_ratio, 6),
    )

def geodesic_rhs(t, state, Rs):
    """
    Right-hand side of geodesic equations in Schwarzschild spacetime.
    State vector: [r, phi, dr/dt, dphi/dt]
    Uses natural units where c=1, G=1.
    """
    r, phi, r_dot, phi_dot = state

    if r <= Rs * 0.5:
        return [0, 0, 0, 0]  # stop inside horizon

    # Effective potential derivative
    # From Schwarzschild geodesic: d²r/dλ² = -GM/r² + L²(r-3GM/r³)/r
    GM = Rs / 2  # in natural units Rs = 2GM
    L  = r**2 * phi_dot  # conserved angular momentum

    r_ddot   = (L**2 / r**3) * (1 - 3 * GM / r) - GM / r**2
    phi_ddot = -2 * r_dot * phi_dot / r

    return [r_dot, phi_dot, r_ddot, phi_ddot]

def trace_ray(
    impact_parameter: float,
    config: BlackHoleConfig,
    n_points: int = 200
) -> RayPath:
    """
    Trace a single light ray with given impact parameter b.
    Returns the path as a list of (x, y) points.
    """
    Rs    = 1.0   # normalized — Rs = 1 in our units
    r0    = 20.0  # start far from black hole
    phi0  = 0.0

    # Initial velocity components for a ray coming from infinity
    # b = impact parameter (perpendicular distance from BH)
    b = impact_parameter
    if b < 1e-6:
        b = 1e-6

    v_r   = -1.0                   # moving inward
    v_phi = 1.0 / (r0 * b) if b > 0 else 0.0

    state0 = [r0, phi0, v_r, v_phi]

    captured  = False
    deflected = False

    try:
        sol = solve_ivp(
            geodesic_rhs,
            t_span=[0, 300],
            y0=state0,
            args=(Rs,),
            max_step=0.5,
            dense_output=False,
            events=None,
            rtol=1e-6,
            atol=1e-8,
        )

        r_vals   = sol.y[0]
        phi_vals = sol.y[1]

        # Convert polar → cartesian
        x_vals = r_vals * np.cos(phi_vals)
        y_vals = r_vals * np.sin(phi_vals)

        points = [[round(float(x), 4), round(float(y), 4)]
                  for x, y in zip(x_vals, y_vals)]

        # Check if captured (ray fell inside event horizon)
        captured  = bool(np.any(r_vals < Rs * 1.1))
        deflected = bool(np.max(np.abs(phi_vals)) > np.pi / 6)

    except Exception:
        points    = [[r0, 0.0]]
        captured  = False
        deflected = False

    return RayPath(
        ray_id=int(b * 100),
        points=points,
        deflected=deflected,
        captured=captured,
    )

def trace_multiple_rays(
    config: BlackHoleConfig,
    n_rays: int = 20
) -> List[RayPath]:
    """
    Trace multiple rays with varying impact parameters.
    b ranges from just outside photon sphere to far away.
    """
    Rs       = 1.0
    b_min    = 2.6 * Rs   # just outside photon sphere (3√3/2 ≈ 2.598)
    b_max    = 15.0 * Rs
    b_values = np.linspace(b_min, b_max, n_rays)

    rays = [trace_ray(float(b), config) for b in b_values]
    return rays

def doppler_shift(
    v_tangential: float,
    inclination_deg: float
) -> dict:
    """
    Relativistic Doppler effect for accretion disk.
    Returns color shift factor for approaching/receding sides.
    v_tangential: tangential velocity as fraction of c (0 to 1)
    """
    inc  = np.radians(inclination_deg)
    beta = v_tangential * np.sin(inc)  # projected velocity

    # Relativistic Doppler: f_obs/f_emit = sqrt((1+β)/(1-β))
    beta   = np.clip(beta, -0.999, 0.999)
    factor = float(np.sqrt((1 + beta) / (1 - beta)))

    return {
        "approaching_factor": round(factor, 4),      # blueshift > 1
        "receding_factor":    round(1 / factor, 4),  # redshift < 1
    }

def keplerian_velocity(r_rs: float, mass_solar: float) -> float:
    """
    Keplerian orbital velocity at radius r (in Rs units).
    v = sqrt(GM/r) — returns as fraction of c.
    """
    Rs = schwarzschild_radius(mass_solar)
    r  = r_rs * Rs

    if r <= 0:
        return 0.0

    GM  = G * mass_solar * M_SUN
    v   = np.sqrt(GM / r)
    return round(float(v / C), 6)  # as fraction of c