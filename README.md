# Black Hole Visualizer

An interactive, physically-grounded black hole simulation built with React, WebGL, and a FastAPI physics backend. Explore gravitational lensing, accretion disk dynamics, relativistic time dilation, spacecraft geodesics, and spaghettification — all in real time.

Live Link: https://black-hole-visualizer.vercel.app/

---

## Features

### Visualization
- **WebGL renderer** — custom GLSL fragment shader simulating gravitational lensing, a relativistic accretion disk with Doppler blueshifting/redshifting, an Einstein ring, relativistic jets, and Hawking radiation particles
- **Starmap lensing** — background star field is distorted in real time around the photon sphere using a Schwarzschild deflection model
- **Accretion disk** — temperature gradient (blue-white core → orange-red outer rim), inclination-aware Doppler effect, and Keplerian rotation

### Controls
- Adjust **mass** (0.1 – 10,000,000 M☉), **spin** (Kerr parameter 0–0.999), **accretion rate**, and **viewing inclination**
- Toggle **Hawking radiation** and **time dilation** overlays
- Physics readout panel with Schwarzschild radius, shadow radius, photon sphere, Einstein ring, deflection angle, and Doppler factors

### Spacecraft Probe
- Launch a test-particle probe with configurable **orbit radius**, **trajectory angle**, and **thrust speed**
- Real-time **RK4 geodesic integration** in Schwarzschild spacetime (effective-potential formulation)
- Trail rendering with classification-coloured glow: **cyan** (pending) → **red** (captured) / **green** (escape) / **blue** (stable orbit)
- HUD overlay showing live r, φ, and proper time τ
- Thrust and explosion particle systems

### Spaghettification Mode
- Drop an object toward the singularity and watch tidal stretching in action

### Gravitational Time Dilation Clock
- Side-by-side analog clocks: far observer vs. near-horizon observer
- Adjustable observer distance slider — time factor computed as √(1 − Rₛ/r)

### Catalog & Sharing
- Built-in NASA catalog: Sgr A\*, M87\*, Cygnus X-1, TON 618, GW150914
- Save simulation state as a PNG export with full physics readout
- Share simulations via URL-based tokens

---

## Architecture

```
black-hole-visualizer/
├── client/                  # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── BlackHoleCanvas.tsx       # WebGL renderer
│   │   │   ├── SpacecraftOverlay.tsx     # Canvas 2D geodesic overlay
│   │   │   ├── TimeDilationClock.tsx     # Analog clock widget
│   │   │   ├── SpaghettificationOverlay.tsx
│   │   │   ├── ControlPanel.tsx          # Sliders and toggles
│   │   │   ├── ProbeControls.tsx         # Probe launch UI
│   │   │   ├── CatalogPanel.tsx          # NASA catalog
│   │   │   ├── InfoOverlay.tsx
│   │   │   ├── ShareModal.tsx
│   │   │   └── Savemodal.tsx
│   │   ├── hooks/
│   │   │   ├── useBlackHole.ts           # Physics API + local fallback
│   │   │   ├── useNASAData.ts            # Catalog hook
│   │   │   ├── useSimulation.ts          # Save / share
│   │   │   └── useWebSocket.ts           # Ray-stream WebSocket
│   │   ├── store/
│   │   │   └── simulationStore.ts        # Zustand global state
│   │   ├── utils/
│   │   │   ├── geodesic.ts               # RK4 Schwarzschild integrator
│   │   │   └── localphysics.ts           # Client-side physics fallback
│   │   ├── types/
│   │   │   ├── blackhole.ts
│   │   │   └── nasa.ts
│   │   └── shaders/
│   │       ├── lensing.frag.glsl
│   │       └── lensing.vert.glsl
│   ├── package.json
│   └── vite.config.ts
│
└── server/                  # FastAPI Python backend
    ├── main.py
    ├── requirements.txt
    ├── routers/
    │   ├── physics.py        # Lensing, time dilation, ray tracing, Doppler
    │   ├── nasa.py           # Black hole catalog + NASA APOD
    │   └── simulation.py     # Save / load / share endpoints
    ├── services/
    │   ├── physics_engine.py # NumPy/SciPy physics computations
    │   └── nasa_service.py   # Catalog data + NASA API integration
    ├── websocket/
    │   └── stream_engine.py  # WebSocket ray streaming
    └── db/
        ├── database.py       # SQLAlchemy setup (SQLite / PostgreSQL)
        └── schema.py         # Simulation and ShareToken models
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- (Optional) PostgreSQL for production; SQLite is used by default

---

### Frontend

```bash
cd client
npm install
```

Create a `.env` file in `client/`:

```env
# Optional — if not set, the app runs entirely with the client-side physics fallback
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/raystream
```

```bash
npm run dev
```

The app is available at `http://localhost:5173`. It works fully offline — if the API is unreachable, all physics fall back to the built-in TypeScript implementation.

---

### Backend

```bash
cd server
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `server/`:

```env
DATABASE_URL=sqlite:///./blackhole.db   # or a PostgreSQL URL
NASA_API_KEY=DEMO_KEY                   # optional — get a free key at api.nasa.gov
FRONTEND_URL=http://localhost:5173      # used to generate share links
```

```bash
uvicorn main:app --reload --port 8000
```

Interactive API docs are available at `http://localhost:8000/docs`.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/physics/full-analysis` | Lensing + time dilation + Doppler + ray trace in one call |
| `POST` | `/api/physics/lensing` | Gravitational lensing parameters |
| `POST` | `/api/physics/time-dilation` | Time dilation factor at a given observer distance |
| `POST` | `/api/physics/raytrace` | Trace N light rays around the black hole |
| `GET`  | `/api/physics/doppler` | Relativistic Doppler shift factors |
| `GET`  | `/api/nasa/catalog` | Black hole catalog |
| `GET`  | `/api/nasa/blackhole/{name}` | Single catalog entry |
| `POST` | `/api/simulation/save` | Persist a configuration |
| `GET`  | `/api/simulation/load/{id}` | Load by ID |
| `POST` | `/api/simulation/share/{id}` | Generate share token |
| `GET`  | `/api/simulation/share/{token}` | Load by share token |
| `WS`   | `/ws/raystream` | Stream ray paths in real time |

---

## Physics Notes

The simulation is based on the **Schwarzschild metric** (non-rotating black hole model with spin visually added via frame-dragging in the shader):

- All lengths are internally in units of the **Schwarzschild radius** Rₛ = 2GM/c²
- The **geodesic integrator** uses RK4 with the effective-potential formulation:
  d²r/dτ² = −1/(2r²) + L²/r³ − 3L²/(2r⁴)
- **Time dilation** factor: dτ/dt = √(1 − Rₛ/r)
- **Photon sphere** at r = 1.5 Rₛ, **ISCO** at r = 3 Rₛ, **event horizon** at r = Rₛ
- Probe classification thresholds: r ≤ Rₛ → captured; r > 50 Rₛ → escaped; Δφ ≥ 4π → stable orbit

---

## Deployment

### Frontend (Vercel)

The `client/vercel.json` includes a catch-all rewrite rule for SPA routing. Connect the `client/` directory to a Vercel project and set environment variables via the Vercel dashboard.

### Backend

Any platform supporting Python + uvicorn works (Railway, Render, Fly.io, etc.). Set `DATABASE_URL` to a PostgreSQL connection string for production persistence.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19, TypeScript 6 |
| Bundler | Vite 8 |
| Styling | Tailwind CSS 4 |
| 3D / GPU | WebGL 2, custom GLSL shaders |
| State management | Zustand 5 |
| HTTP client | Axios |
| Physics backend | FastAPI, NumPy, SciPy |
| Database | SQLAlchemy + SQLite / PostgreSQL |
| Real-time | WebSocket (FastAPI + native browser API) |

---

## License

MIT
