from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.physics_engine import trace_ray, BlackHoleConfig
import asyncio
import json
import numpy as np

router = APIRouter()

@router.websocket("/ws/raystream")
async def raystream(websocket: WebSocket):
    """
    Stream computed ray paths to the frontend in real time.
    Client sends a BlackHoleConfig JSON, server streams rays one by one.
    """
    await websocket.accept()

    try:
        while True:
            # Receive config from client
            raw = await websocket.receive_text()
            data = json.loads(raw)

            config = BlackHoleConfig(
                mass           = data.get("mass", 10.0),
                spin           = data.get("spin", 0.5),
                accretion_rate = data.get("accretion_rate", 0.5),
                inclination    = data.get("inclination", 30.0),
                hawking_on     = data.get("hawking_on", False),
                time_dilation  = data.get("time_dilation", True),
            )

            n_rays   = data.get("n_rays", 20)
            b_values = np.linspace(2.6, 15.0, n_rays)

            # Stream each ray as it's computed
            for i, b in enumerate(b_values):
                ray = trace_ray(float(b), config)

                await websocket.send_text(json.dumps({
                    "type":     "ray",
                    "progress": round((i + 1) / n_rays, 2),
                    "ray":      ray.model_dump(),
                }))

                await asyncio.sleep(0.02)  # small delay for smooth streaming

            # Signal completion
            await websocket.send_text(json.dumps({
                "type":     "done",
                "progress": 1.0,
                "total":    n_rays,
            }))

    except WebSocketDisconnect:
        print("Client disconnected from ray stream")
    except Exception as e:
        await websocket.send_text(json.dumps({
            "type":  "error",
            "message": str(e),
        }))