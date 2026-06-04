from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SimulationCreate(BaseModel):
    name: Optional[str] = None
    mass: float          = 10.0
    spin: float          = 0.5
    accretion_rate: float= 0.5
    inclination: float   = 30.0
    hawking_on: bool     = False
    time_dilation: bool  = True

class SimulationResponse(BaseModel):
    id: str
    name: Optional[str]
    mass: float
    spin: float
    accretion_rate: float
    inclination: float
    hawking_on: bool
    time_dilation: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ShareTokenResponse(BaseModel):
    token: str
    simulation_id: str
    share_url: str