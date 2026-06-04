from fastapi import APIRouter, HTTPException
from services.nasa_service import (
    get_black_hole_catalog,
    get_black_hole_by_name,
    get_apod,
)

router = APIRouter()

@router.get("/catalog")
async def black_hole_catalog():
    """
    Return real black hole data catalog.
    Includes Sgr A*, M87*, Cygnus X-1 and others.
    """
    return await get_black_hole_catalog()

@router.get("/blackhole/{name}")
async def get_black_hole(name: str):
    """Get a specific black hole by name."""
    data = await get_black_hole_by_name(name)
    if not data:
        raise HTTPException(status_code=404, detail=f"Black hole '{name}' not found")
    return data

@router.get("/apod")
async def astronomy_picture():
    """Fetch NASA Astronomy Picture of the Day."""
    return await get_apod()