from pydantic import BaseModel, Field
from typing import Optional

class BlackHoleConfig(BaseModel):
    mass: float           = Field(default=10.0,  ge=0.1,   le=1e10,  description="Mass in solar masses")
    spin: float           = Field(default=0.5,   ge=0.0,   le=0.999, description="Dimensionless spin parameter")
    accretion_rate: float = Field(default=0.5,   ge=0.0,   le=1.0,   description="Accretion rate 0-1")
    inclination: float    = Field(default=30.0,  ge=0.0,   le=90.0,  description="Viewing angle in degrees")
    hawking_on: bool      = Field(default=False)
    time_dilation: bool   = True

class LensingResult(BaseModel):
    einstein_radius: float
    deflection_angle: float
    photon_sphere_radius: float
    shadow_radius: float

class TimeDilationResult(BaseModel):
    r_observer: float        # distance from center in Schwarzschild radii
    time_factor: float       # how much slower time runs (0 to 1)
    proper_time_ratio: float

class RayPath(BaseModel):
    ray_id: int
    points: list[list[float]]  # list of [x, y] coordinates
    deflected: bool
    captured: bool             # True if ray falls into black hole