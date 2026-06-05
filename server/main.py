from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from db.database import init_db
from routers import physics, nasa, simulation
from websocket.stream_engine import router as ws_router
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # creates blackhole.db here
    yield

app = FastAPI(
    title="Black Hole Visualizer API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(physics.router,    prefix="/api/physics",    tags=["Physics"])
app.include_router(nasa.router,       prefix="/api/nasa",       tags=["NASA"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["Simulation"])
app.include_router(ws_router,                                   tags=["WebSocket"])

@app.get("/")
def root():
    return {"status": "Black Hole Visualizer API is running"}