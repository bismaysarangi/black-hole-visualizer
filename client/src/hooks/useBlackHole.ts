import { useCallback, useEffect } from "react";
import { useSimulationStore } from "../store/simulationStore";
import { physicsAPI } from "../api/client";
import { computeLocalAnalysis } from "../utils/localphysics";
import type { BlackHoleConfig } from "../types/blackhole";

export function useBlackHole() {
  const { config, setConfig, setAnalysis, setLoading, isLoading, analysis } =
    useSimulationStore();

  const fetchAnalysis = useCallback(
    async (cfg: BlackHoleConfig) => {
      setLoading(true);
      try {
        const result = await physicsAPI.fullAnalysis(cfg);
        setAnalysis(result);
      } catch (err) {
        // API unavailable (405, network error, missing VITE_API_URL, etc.)
        // Fall back to client-side physics so the visualizer still works.
        console.warn("Physics API unavailable — using local fallback:", err);
        setAnalysis(computeLocalAnalysis(cfg));
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setAnalysis],
  );

  // Auto-fetch when config changes
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchAnalysis(config);
    }, 400);

    return () => clearTimeout(debounce);
  }, [config, fetchAnalysis]);

  const updateConfig = useCallback(
    (patch: Partial<BlackHoleConfig>) => {
      setConfig(patch);
    },
    [setConfig],
  );

  // Derived physics values for display
  const schwarzschildRadius = config.mass * 2.95;
  const hawkingTemp =
    config.mass > 0 ? (1.227e23 / config.mass).toExponential(3) : "0";

  return {
    config,
    analysis,
    isLoading,
    updateConfig,
    fetchAnalysis,
    schwarzschildRadius: schwarzschildRadius.toFixed(2),
    hawkingTemp,
  };
}
