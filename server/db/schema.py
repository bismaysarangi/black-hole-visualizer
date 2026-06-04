from sqlalchemy import Column, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from db.database import Base
import uuid

class Simulation(Base):
    __tablename__ = "simulations"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name          = Column(String, nullable=True)
    mass          = Column(Float, default=10.0)       # in solar masses
    spin          = Column(Float, default=0.5)        # 0 to 1 (Kerr parameter)
    accretion_rate= Column(Float, default=0.5)
    inclination   = Column(Float, default=30.0)       # viewing angle degrees
    hawking_on    = Column(Boolean, default=False)
    time_dilation = Column(Boolean, default=True)
    created_at    = Column(DateTime, server_default=func.now())

class ShareToken(Base):
    __tablename__ = "share_tokens"

    token         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    simulation_id = Column(String, nullable=False)
    created_at    = Column(DateTime, server_default=func.now())