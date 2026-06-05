import { useState, useEffect } from "react";
import { nasaAPI } from "../api/client";
import { useSimulationStore } from "../store/simulationStore";
import type { BlackHoleEntry, NASACatalog } from "../types/nasa";

// Offline catalog so the Catalog tab is always useful even without a backend
const FALLBACK_CATALOG: NASACatalog = {
  count: 5,
  black_holes: [
    {
      name: "Sagittarius A*",
      slug: "sgr-a",
      description: "Supermassive black hole at the center of the Milky Way",
      mass_solar: 4_100_000,
      distance_ly: 26_000,
      spin: 0.9,
      type: "supermassive",
      discovered: 1974,
      source: "Event Horizon Telescope 2022",
      image_url: null,
    },
    {
      name: "M87*",
      slug: "m87",
      description:
        "First black hole ever directly imaged, in galaxy Messier 87",
      mass_solar: 6_500_000_000,
      distance_ly: 53_490_000,
      spin: 0.98,
      type: "supermassive",
      discovered: 1918,
      source: "Event Horizon Telescope 2019",
      image_url: null,
    },
    {
      name: "Cygnus X-1",
      slug: "cygnus-x1",
      description: "First black hole identified, a stellar-mass X-ray binary",
      mass_solar: 21.2,
      distance_ly: 7_200,
      spin: 0.998,
      type: "stellar",
      discovered: 1964,
      source: "LIGO/Chandra observations",
      image_url: null,
    },
    {
      name: "TON 618",
      slug: "ton-618",
      description: "One of the most massive known black holes in the universe",
      mass_solar: 66_000_000_000,
      distance_ly: 10_400_000_000,
      spin: 0.5,
      type: "ultramassive",
      discovered: 1970,
      source: "Sloan Digital Sky Survey",
      image_url: null,
    },
    {
      name: "GW150914",
      slug: "gw150914",
      description:
        "First gravitational wave detection — two merging black holes",
      mass_solar: 62,
      distance_ly: 1_300_000_000,
      spin: 0.67,
      type: "stellar",
      discovered: 2015,
      source: "LIGO collaboration",
      image_url: null,
    },
  ],
};

export function useNASAData() {
  const [catalog, setCatalog] = useState<NASACatalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setConfig } = useSimulationStore();

  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await nasaAPI.catalog();
        // Validate that we actually got black_holes array before trusting it
        if (data && Array.isArray(data.black_holes)) {
          setCatalog(data);
        } else {
          throw new Error("Unexpected catalog shape");
        }
      } catch (err: unknown) {
        console.warn(
          "NASA catalog API unavailable — using built-in catalog:",
          err,
        );
        // Use fallback so the tab is never blank
        setCatalog(FALLBACK_CATALOG);
        // Only show an error banner if there's a real API URL configured
        // (i.e. user expects a live backend)
        if (import.meta.env.VITE_API_URL) {
          const message =
            err instanceof Error ? err.message : "Failed to load NASA catalog";
          setError(message);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const loadBlackHole = (entry: BlackHoleEntry) => {
    setConfig({
      mass: Math.min(entry.mass_solar, 1e7),
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
