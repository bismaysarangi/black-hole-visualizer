# Black Hole Visualizer

A real-time, physically accurate black hole simulation built with React, Three.js, and FastAPI. Visualizes gravitational lensing, accretion disk dynamics, Hawking radiation, and relativistic time dilation using numerical solutions to the Schwarzschild and Kerr geodesic equations.

**Live:** https://black-hole-visualizer.vercel.app

---

## Overview

Black Hole Visualizer combines relativistic physics computation with GPU-accelerated rendering to produce an interactive simulation of black hole spacetime. Users can configure black hole parameters in real time and observe the corresponding changes in gravitational lensing, photon sphere geometry, Doppler shifting across the accretion disk, and time dilation at varying observer distances.

A curated catalog of real astronomical black holes — including Sagittarius A*, M87*, and Cygnus X-1 — can be loaded directly into the simulator from published observational data.

---

## Features

- **Gravitational Lensing** — GLSL fragment shader implementing Schwarzschild lensing with Kerr frame-dragging corrections
- **Accretion Disk** — Keplerian rotation with blackbody temperature gradient, relativistic Doppler brightening, and asymmetric blueshift/redshift
- **Ray Tracing** — Numerical integration of geodesic equations via SciPy, streamed to the client over WebSocket
- **Time Dilation Overlay** — Real-time computation of gravitational time dilation from the Schwarzschild metric
- **Hawking Radiation** — Visual representation of quantum evaporation scaled to black hole mass
- **NASA Catalog** — Five real black holes with published mass, spin, distance, and discovery metadata
- **Save and Share** — Persist any simulation configuration and generate a shareable link
- **Responsive Layout** — Full mobile support with collapsible sidebar

---

## Tech Stack

**Frontend**
- React 19 with TypeScript
- Three.js via React Three Fiber
- Custom GLSL shaders (vertex + fragment)
- Zustand for global state
- Tailwind CSS v4
- Vite

**Backend**
- FastAPI
- NumPy + SciPy (geodesic integration, lensing mathematics)
- SQLAlchemy with PostgreSQL
- WebSocket ray streaming
- Uvicorn

**Infrastructure**
- Frontend: Vercel
- Backend + Database: Render (Web Service + PostgreSQL)

---

## Architecture

```
client/
  src/
    api/          # Axios REST client
    components/   # Canvas, ControlPanel, CatalogPanel, InfoOverlay, ShareModal
    hooks/        # useBlackHole, useNASAData, useSimulation, useWebSocket
    shaders/      # lensing.vert.glsl, lensing.frag.glsl
    store/        # Zustand simulation store
    types/        # TypeScript interfaces

server/
  routers/        # physics, nasa, simulation endpoints
  services/       # physics_engine.py, nasa_service.py
  websocket/      # stream_engine.py (ray streaming)
  db/             # SQLAlchemy models, schema, migrations
  models/         # Pydantic request/response models
```

**Data flow:**
```
Browser (Vercel)
  |-- HTTPS REST --> FastAPI (Render)  --> PostgreSQL (Render)
  |-- WSS         --> /ws/raystream    --> SciPy geodesic solver
```

---

## Physics

The simulation implements the following:

**Schwarzschild Metric**
Event horizon radius, photon sphere at 1.5 Rs, shadow radius at (3√3/2) Rs, and Einstein ring radius. Gravitational time dilation computed as d-tau/dt = sqrt(1 - Rs/r).

**Geodesic Ray Tracing**
Light ray paths solved via `scipy.integrate.solve_ivp` on the geodesic ODE system in Schwarzschild spacetime. Impact parameters sweep from just outside the photon sphere to the far field.

**Kerr Frame Dragging**
Spin parameter a (0 to 0.999) modifies lensing asymmetry and accretion disk rotation in the shader via a tangential twist term.

**Relativistic Doppler**
Disk color shift computed as f_obs/f_emit = sqrt((1+beta)/(1-beta)) where beta is the projected tangential velocity at a given inclination.

**Hawking Temperature**
T_H = hbar * c^3 / (8 * pi * G * M * k_B), displayed in Kelvin from the control panel.

---

## Local Development

**Prerequisites:** Node.js 18+, Python 3.11+

**Backend**

```bash
cd server
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # set NASA_API_KEY and DATABASE_URL
uvicorn main:app --reload --port 8000
```

**Frontend**

```bash
cd client
npm install
cp .env.example .env.local     # set VITE_API_URL and VITE_WS_URL
npm run dev
```

The app will be available at `http://localhost:5173`.

**Environment Variables**

Backend (`server/.env`):
```
DATABASE_URL=postgresql://user:password@host/dbname
NASA_API_KEY=your_nasa_api_key
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

Frontend (`client/.env.local`):
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/raystream
```

---

## Deployment

**Backend — Render**

- Service type: Web Service
- Root directory: `server`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add a Render PostgreSQL instance and connect via `DATABASE_URL` environment variable

**Frontend — Vercel**

- Root directory: `client`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` and `VITE_WS_URL` in Vercel environment variables

A `vercel.json` rewrite rule is included to handle SPA client-side routing for share links (`/share/:token`).

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/physics/full-analysis` | Lensing, time dilation, Doppler, ray paths |
| POST | `/api/physics/lensing` | Gravitational lensing parameters |
| POST | `/api/physics/time-dilation` | Time dilation at observer distance |
| POST | `/api/physics/raytrace` | Trace N light rays |
| GET | `/api/nasa/catalog` | Full black hole catalog |
| GET | `/api/nasa/blackhole/{name}` | Single black hole by slug |
| POST | `/api/simulation/save` | Persist simulation configuration |
| GET | `/api/simulation/load/{id}` | Load simulation by ID |
| POST | `/api/simulation/share/{id}` | Generate share token |
| GET | `/api/simulation/share/{token}` | Load simulation by share token |
| WS | `/ws/raystream` | Stream ray paths in real time |

---

## NASA Catalog

| Name | Type | Mass | Distance |
|------|------|------|----------|
| Sagittarius A* | Supermassive | 4.1M solar | 26,000 ly |
| M87* | Supermassive | 6.5B solar | 53.5M ly |
| Cygnus X-1 | Stellar | 21.2 solar | 7,200 ly |
| TON 618 | Ultramassive | 66B solar | 10.4B ly |
| GW150914 | Stellar | 62 solar | 1.3B ly |

---

## License

MIT
