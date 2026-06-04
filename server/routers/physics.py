from fastapi import APIRouter, Query
from models.blackhole import BlackHoleConfig, LensingResult, TimeDilationResult
from services.physics_engine import (
    compute_lensing,
    compute_time_dilation,
    trace_multiple_rays,
    doppler_shift,
    keplerian_velocity,
)

router = APIRouter()

@router.post("/lensing", response_model=LensingResult)
def get_lensing(config: BlackHoleConfig):
    """Compute gravitational lensing parameters for a black hole config."""
    return compute_lensing(config)

@router.post("/time-dilation", response_model=TimeDilationResult)
def get_time_dilation(
    config: BlackHoleConfig,
    r_observer: float = Query(default=5.0, ge=1.01, le=1000.0,
                              description="Observer distance in Schwarzschild radii")
):
    """Compute gravitational time dilation at a given distance."""
    return compute_time_dilation(config, r_observer)

@router.post("/raytrace")
def get_raytrace(config: BlackHoleConfig, n_rays: int = Query(default=20, ge=5, le=100)):
    """Trace multiple light rays around the black hole."""
    rays = trace_multiple_rays(config, n_rays)
    return {"rays": [r.model_dump() for r in rays]}

@router.get("/doppler")
def get_doppler(
    v_tangential: float = Query(default=0.3,  ge=0.0, le=0.999),
    inclination:  float = Query(default=30.0, ge=0.0, le=90.0),
):
    """Compute Doppler shift factors for accretion disk sides."""
    return doppler_shift(v_tangential, inclination)

@router.get("/keplerian")
def get_keplerian(
    r_rs:        float = Query(default=6.0,  ge=1.0,   le=1000.0),
    mass_solar:  float = Query(default=10.0, ge=0.1,   le=1e10),
):
    """Get Keplerian orbital velocity at radius r (in Rs units)."""
    v = keplerian_velocity(r_rs, mass_solar)
    return {"r_rs": r_rs, "velocity_fraction_c": v}

@router.post("/full-analysis")
def full_analysis(config: BlackHoleConfig):
    """
    One-shot endpoint — returns everything the frontend needs
    to render the initial scene: lensing, time dilation, doppler, rays.
    """
    lensing       = compute_lensing(config)
    time_dilation = compute_time_dilation(config, r_observer_rs=5.0)
    rays          = trace_multiple_rays(config, n_rays=15)
    doppler       = doppler_shift(
                        v_tangential=keplerian_velocity(6.0, config.mass),
                        inclination_deg=config.inclination
                    )

    return {
        "lensing":       lensing.model_dump(),
        "time_dilation": time_dilation.model_dump(),
        "doppler":       doppler,
        "rays":          [r.model_dump() for r in rays],
        "config":        config.model_dump(),
    }