import { useState, useEffect } from "react";
import { nasaAPI } from "../api/client";
import { useSimulationStore } from "../store/simulationStore";
import type { BlackHoleEntry, NASACatalog } from "../types/nasa";

export function useNASAData() {
  const [catalog, setCatalog] = useState<NASACatalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setConfig } = useSimulationStore();

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await nasaAPI.catalog();
        setCatalog(data);
      } catch (err) {
        setError("Failed to load NASA catalog");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  // Load a real black hole into the simulator
  const loadBlackHole = (entry: BlackHoleEntry) => {
    setConfig({
      mass: Math.min(entry.mass_solar, 1e10),
      spin: entry.spin,
      accretion_rate: 0.5,
      inclination: 30.0,
    });
  };

  const formatMass = (mass: number): string => {
    if (mass >= 1e9) return `${(mass / 1e9).toFixed(2)}B M☉`;
    if (mass >= 1e6) return `${(mass / 1e6).toFixed(2)}M M☉`;
    return `${mass.toFixed(1)} M☉`;
  };

  const formatDistance = (ly: number): string => {
    if (ly >= 1e9) return `${(ly / 1e9).toFixed(1)}B ly`;
    if (ly >= 1e6) return `${(ly / 1e6).toFixed(1)}M ly`;
    if (ly >= 1e3) return `${(ly / 1e3).toFixed(1)}K ly`;
    return `${ly} ly`;
  };

  return {
    catalog,
    isLoading,
    error,
    loadBlackHole,
    formatMass,
    formatDistance,
  };
}
