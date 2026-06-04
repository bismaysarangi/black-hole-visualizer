from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db.schema import Simulation, ShareToken
from models.simulation import SimulationCreate, SimulationResponse, ShareTokenResponse
import uuid

router = APIRouter()

@router.post("/save", response_model=SimulationResponse)
def save_simulation(data: SimulationCreate, db: Session = Depends(get_db)):
    """Save a black hole simulation configuration."""
    sim = Simulation(
        id             = str(uuid.uuid4()),
        name           = data.name,
        mass           = data.mass,
        spin           = data.spin,
        accretion_rate = data.accretion_rate,
        inclination    = data.inclination,
        hawking_on     = data.hawking_on,
        time_dilation  = data.time_dilation,
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)
    return sim

@router.get("/load/{simulation_id}", response_model=SimulationResponse)
def load_simulation(simulation_id: str, db: Session = Depends(get_db)):
    """Load a saved simulation by ID."""
    sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim

@router.get("/list", response_model=list[SimulationResponse])
def list_simulations(db: Session = Depends(get_db)):
    """List all saved simulations."""
    return db.query(Simulation).order_by(Simulation.created_at.desc()).all()

@router.delete("/{simulation_id}")
def delete_simulation(simulation_id: str, db: Session = Depends(get_db)):
    """Delete a simulation."""
    sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    db.delete(sim)
    db.commit()
    return {"deleted": simulation_id}

@router.post("/share/{simulation_id}", response_model=ShareTokenResponse)
def create_share_token(simulation_id: str, db: Session = Depends(get_db)):
    """Generate a shareable token for a simulation."""
    sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    token = ShareToken(
        token         = str(uuid.uuid4())[:8],
        simulation_id = simulation_id,
    )
    db.add(token)
    db.commit()
    db.refresh(token)

    return ShareTokenResponse(
        token         = token.token,
        simulation_id = simulation_id,
        share_url     = f"http://localhost:5173/share/{token.token}",
    )

@router.get("/share/{token}", response_model=SimulationResponse)
def load_by_share_token(token: str, db: Session = Depends(get_db)):
    """Load a simulation using a share token."""
    share = db.query(ShareToken).filter(ShareToken.token == token).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share token not found")

    sim = db.query(Simulation).filter(Simulation.id == share.simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    return sim