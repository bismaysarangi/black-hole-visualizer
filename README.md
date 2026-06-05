# Black Hole Visualizer

An interactive, scientifically grounded black hole simulation built with React, WebGL, and FastAPI. Renders gravitational lensing, accretion disk physics, relativistic jets, and time dilation effects in real time using GLSL shaders and a Python physics backend.

---

## Overview

This project simulates the visual appearance of a black hole using the Schwarzschild and Kerr metrics from general relativity. The frontend renders everything on the GPU via raw WebGL shaders. The backend computes geodesics, lensing parameters, and Doppler shifts using real astrophysical equations, and exposes them over a REST API and WebSocket stream.

Real black hole data — Sagittarius A*, M87*, Cygnus X-1, TON 618, and GW150914 — is included from published astronomical measurements and can be loaded directly into the simulator.

---

## Features

- Gravitational lensing via Schwarzschild metric distortion of a starfield background
- Accretion disk with Keplerian rotation and relativistic Doppler blueshift and redshift
- Kerr frame-dragging and spin-dependent jet visualization
- Einstein ring rendered at the photon sphere radius
- Hawking radiation particle effect around the event horizon
- Inclination control — view from face-on to edge-on
- Time dilation overlay showing proper time ratio near the horizon
- Real NASA black hole catalog with one-click loading into the simulator
- Save and share simulations via generated share tokens
- WebSocket streaming of computed ray paths
- Fully responsive — desktop and mobile

---

## Project Structure

```
black-hole-visualizer/
│
├── client/                          # React + TypeScript + WebGL
│   ├── public/
│   │   └── starmap.png              # Deep space star texture
│   ├── src/
│   │   ├── components/
│   │   │   ├── BlackHoleCanvas.tsx  # Raw WebGL renderer and GLSL shaders
│   │   │   ├── ControlPanel.tsx     # Sliders, toggles, physics readout
│   │   │   ├── CatalogPanel.tsx     # NASA black hole catalog
│   │   │   ├── InfoOverlay.tsx      # Time dilation and status overlay
│   │   │   └── ShareModal.tsx       # Share URL modal
│   │   ├── hooks/
│   │   │   ├── useBlackHole.ts      # Physics state and auto-fetch
│   │   │   ├── useNASAData.ts       # Catalog fetch and formatting
│   │   │   ├── useWebSocket.ts      # Ray path streaming
│   │   │   └── useSimulation.ts     # Save, load, share
│   │   ├── types/
│   │   │   ├── blackhole.ts         # BlackHoleConfig, RayPath, etc.
│   │   │   └── nasa.ts              # NASA catalog types
│   │   ├── api/
│   │   │   └── client.ts            # Axios instance and API calls
│   │   └── store/
│   │       └── simulationStore.ts   # Zustand global state
│   ├── index.html
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                          # Python + FastAPI
│   ├── main.py                      # App entry point and middleware
│   ├── routers/
│   │   ├── physics.py               # Lensing, time dilation, ray trace endpoints
│   │   ├── nasa.py                  # Black hole catalog and APOD proxy
│   │   └── simulation.py            # Save, load, share endpoints
│   ├── services/
│   │   ├── physics_engine.py        # Schwarzschild metric, geodesics, Doppler
│   │   ├── nasa_service.py          # Catalog data and NASA API integration
│   │   └── share_service.py         # Share token generation
│   ├── websocket/
│   │   └── stream_engine.py         # WebSocket ray path streaming
│   ├── models/
│   │   ├── blackhole.py             # Pydantic models
│   │   └── simulation.py            # Simulation and share token models
│   ├── db/
│   │   ├── database.py              # SQLAlchemy setup
│   │   └── schema.py                # Table definitions
│   ├── requirements.txt
│   └── .env
│
├── .gitignore
└── README.md
```

---

## Physics

### Gravitational Lensing

Light deflection follows the weak-field Schwarzschild approximation:

```
alpha = 2 * Rs / b
```

where `Rs` is the Schwarzschild radius and `b` is the impact parameter. Near the photon sphere at `r = 1.5 * Rs`, deflection diverges, producing the Einstein ring. This is computed per-fragment in the GLSL shader at full GPU speed.

### Schwarzschild Radius

```
Rs = 2GM / c^2
```

For Sagittarius A* at 4.1 million solar masses, this gives approximately 12.1 million km.

### Time Dilation

Gravitational time dilation from the Schwarzschild metric:

```
dt_proper / dt_coordinate = sqrt(1 - Rs / r)
```

At the photon sphere (r = 1.5 Rs), proper time runs at approximately 57.7% of coordinate time. At the event horizon, it stops entirely.

### Keplerian Accretion

Orbital velocity at radius r:

```
v = sqrt(GM / r)
```

The inner edge of the accretion disk sits at the innermost stable circular orbit (ISCO) at 3 Rs for a Schwarzschild black hole. Relativistic Doppler shift:

```
f_obs / f_emit = sqrt((1 + beta) / (1 - beta))
```

where beta is the projected velocity as a fraction of c.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Rendering | Raw WebGL (GLSL shaders) |
| State management | Zustand |
| HTTP client | Axios |
| Build tool | Vite |
| Styling | Tailwind CSS + CSS variables |
| Backend framework | FastAPI |
| Physics computation | NumPy + SciPy |
| Database | SQLite via SQLAlchemy |
| Real-time streaming | WebSocket |
| NASA data | NASA Open APIs + hardcoded catalog |

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Python 3.10 or higher
- A NASA API key from api.nasa.gov (optional — DEMO_KEY works for development)

### Backend

```bash
cd server
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `server/.env`:

```env
NASA_API_KEY=your_key_here
DATABASE_URL=sqlite:///./blackhole.db
SECRET_KEY=your_secret_key_here
```

Generate a secret key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Start the server:

```bash
uvicorn main:app --reload
```

API runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173`.

---

## API Reference

### Physics

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/physics/full-analysis | Complete lensing, time dilation, ray trace, and Doppler in one call |
| POST | /api/physics/lensing | Lensing radii only |
| POST | /api/physics/time-dilation | Time dilation at a given observer distance |
| POST | /api/physics/raytrace | Trace multiple light ray paths |
| GET | /api/physics/doppler | Doppler shift factors |
| GET | /api/physics/keplerian | Keplerian orbital velocity |

### NASA

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/nasa/catalog | Full black hole catalog |
| GET | /api/nasa/blackhole/{name} | Single black hole by name or slug |
| GET | /api/nasa/apod | NASA Astronomy Picture of the Day |

### Simulation

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/simulation/save | Save a simulation configuration |
| GET | /api/simulation/load/{id} | Load a saved simulation |
| GET | /api/simulation/list | List all saved simulations |
| DELETE | /api/simulation/{id} | Delete a simulation |
| POST | /api/simulation/share/{id} | Generate a share token |
| GET | /api/simulation/share/{token} | Load simulation by share token |

### WebSocket

| Endpoint | Description |
|---|---|
| ws://host/ws/raystream | Stream computed ray paths in real time |

Send a BlackHoleConfig JSON object. Receive ray path events as they are computed.

---

## Black Hole Catalog

| Name | Mass | Distance | Type | Source |
|---|---|---|---|---|
| Sagittarius A* | 4.1M solar masses | 26,000 ly | Supermassive | EHT 2022 |
| M87* | 6.5B solar masses | 53.49M ly | Supermassive | EHT 2019 |
| Cygnus X-1 | 21.2 solar masses | 7,200 ly | Stellar | Chandra |
| TON 618 | 66B solar masses | 10.4B ly | Ultramassive | SDSS |
| GW150914 | 62 solar masses | 1.3B ly | Stellar | LIGO |

---

## Deployment

### Backend — Render

1. Push the `server/` directory to a GitHub repository.
2. Create a new Web Service on render.com.
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `NASA_API_KEY`, `SECRET_KEY`, `DATABASE_URL`
6. For persistent storage use Render's managed PostgreSQL and update `DATABASE_URL` accordingly.

### Frontend — Vercel

1. Push the `client/` directory to a GitHub repository.
2. Import the repository on vercel.com.
3. Set framework preset to Vite.
4. Set build command: `npm run build`
5. Set output directory: `dist`
6. Add environment variable: `VITE_API_URL` pointing to your Render backend URL.
7. Update `client/src/api/client.ts` to use `import.meta.env.VITE_API_URL` as the base URL.

---

## License

MIT
EOF
Output

exit code 0
Done

You are out of free messages until 2:10 PM




Claude is AI and can make mistakes. Please double-check responses.


