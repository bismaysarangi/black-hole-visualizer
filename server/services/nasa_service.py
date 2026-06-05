import httpx
import os
from typing import Optional

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")

BLACK_HOLE_CATALOG = [
    {
        "name": "Sagittarius A*",
        "slug": "sgr-a",
        "description": "Supermassive black hole at the center of the Milky Way",
        "mass_solar": 4_100_000,
        "distance_ly": 26_000,
        "spin": 0.9,
        "type": "supermassive",
        "discovered": 1974,
        "source": "Event Horizon Telescope 2022",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Sagittarius_A%2A_black_hole.jpg/640px-Sagittarius_A%2A_black_hole.jpg"
    },
    {
        "name": "M87*",
        "slug": "m87",
        "description": "First black hole ever directly imaged, in galaxy Messier 87",
        "mass_solar": 6_500_000_000,
        "distance_ly": 53_490_000,
        "spin": 0.98,
        "type": "supermassive",
        "discovered": 1918,
        "source": "Event Horizon Telescope 2019",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Black_hole_-_Messier_87_crop_max_res.jpg/640px-Black_hole_-_Messier_87_crop_max_res.jpg"
    },
    {
        "name": "Cygnus X-1",
        "slug": "cygnus-x1",
        "description": "First black hole identified, a stellar-mass X-ray binary",
        "mass_solar": 21.2,
        "distance_ly": 7_200,
        "spin": 0.998,
        "type": "stellar",
        "discovered": 1964,
        "source": "LIGO/Chandra observations",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Cygnus_X-1.png/640px-Cygnus_X-1.png"
    },
    {
        "name": "TON 618",
        "slug": "ton-618",
        "description": "One of the most massive known black holes in the universe",
        "mass_solar": 66_000_000_000,
        "distance_ly": 10_400_000_000,
        "spin": 0.5,
        "type": "ultramassive",
        "discovered": 1970,
        "source": "Sloan Digital Sky Survey",
        "image_url": None
    },
    {
        "name": "GW150914",
        "slug": "gw150914",
        "description": "First gravitational wave detection — two merging black holes",
        "mass_solar": 62,
        "distance_ly": 1_300_000_000,
        "spin": 0.67,
        "type": "stellar",
        "discovered": 2015,
        "source": "LIGO collaboration",
        "image_url": None
    },
]

async def get_black_hole_catalog() -> dict:
    return {
        "count": len(BLACK_HOLE_CATALOG),
        "black_holes": BLACK_HOLE_CATALOG,
    }

async def get_black_hole_by_name(name: str) -> Optional[dict]:
    name_lower = name.lower().replace(" ", "-")
    for bh in BLACK_HOLE_CATALOG:
        if bh["slug"] == name_lower or bh["name"].lower() == name.lower():
            return bh
    return None

async def get_apod() -> dict:
    url = f"https://api.nasa.gov/planetary/apod?api_key={NASA_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)   # fix: was missing await
            response.raise_for_status()
            return response.json()
    except Exception as e:
        return {
            "title": "NASA APOD Unavailable",
            "explanation": str(e),
            "url": None,
        }