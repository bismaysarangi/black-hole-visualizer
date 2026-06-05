import { useEffect, useRef, useCallback, useState } from "react";
import { useSimulationStore } from "../store/simulationStore";
import type { RayPath } from "../types/blackhole";

const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/raystream";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [rays, setRays] = useState<RayPath[]>([]);
  const [progress, setProgress] = useState(0);
  const [connected, setConnected] = useState(false);

  const { config, setStreaming } = useSimulationStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "ray") {
        setRays((prev) => [...prev, data.ray]);
        setProgress(data.progress);
      }

      if (data.type === "done") {
        setStreaming(false);
        setProgress(1);
      }

      if (data.type === "error") {
        console.error("WS error:", data.message);
        setStreaming(false);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setStreaming(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setConnected(false);
    };
  }, [setStreaming]);

  const streamRays = useCallback(
    (n_rays = 20) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
        return;
      }
      setRays([]);
      setProgress(0);
      setStreaming(true);

      wsRef.current.send(JSON.stringify({ ...config, n_rays }));
    },
    [config, connect, setStreaming],
  );

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    rays,
    progress,
    connected,
    streamRays,
    disconnect,
  };
}
