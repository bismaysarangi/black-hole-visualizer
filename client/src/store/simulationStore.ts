import { create } from "zustand";
import type {
  BlackHoleConfig,
  FullAnalysis,
  ProbeConfig,
  OrbitClassification,
} from "../types/blackhole";

interface SimulationStore {
  config: BlackHoleConfig;
  analysis: FullAnalysis | null;
  isLoading: boolean;
  isStreaming: boolean;
  activeTab: "controls" | "catalog" | "history";
  showShareModal: boolean;
  shareUrl: string | null;

  // Probe state
  probeConfig: ProbeConfig;
  probeActive: boolean;
  probeTrail: [number, number][];
  probeClassification: OrbitClassification | null;

  setConfig: (patch: Partial<BlackHoleConfig>) => void;
  setAnalysis: (a: FullAnalysis) => void;
  setLoading: (v: boolean) => void;
  setStreaming: (v: boolean) => void;
  setActiveTab: (t: "controls" | "catalog" | "history") => void;
  setShowShareModal: (v: boolean) => void;
  setShareUrl: (url: string | null) => void;

  // Probe actions
  setProbeConfig: (patch: Partial<ProbeConfig>) => void;
  setProbeActive: (v: boolean) => void;
  appendProbePoint: (pt: [number, number]) => void;
  setProbeClassification: (c: OrbitClassification) => void;
  resetProbe: () => void;
}

const defaultProbeConfig: ProbeConfig = {
  startR: 10,
  angle: 90,
  speed: 0.1,
};

export const useSimulationStore = create<SimulationStore>((set) => ({
  config: {
    mass: 50.0,
    spin: 0.5,
    accretion_rate: 0.2,
    inclination: 30.0,
    hawking_on: false,
    time_dilation: true,
  },
  analysis: null,
  isLoading: false,
  isStreaming: false,
  activeTab: "controls",
  showShareModal: false,
  shareUrl: null,

  // Probe defaults
  probeConfig: { ...defaultProbeConfig },
  probeActive: false,
  probeTrail: [],
  probeClassification: null,

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  setAnalysis: (a) => set({ analysis: a }),
  setLoading: (v) => set({ isLoading: v }),
  setStreaming: (v) => set({ isStreaming: v }),
  setActiveTab: (t) => set({ activeTab: t }),
  setShowShareModal: (v) => set({ showShareModal: v }),
  setShareUrl: (url) => set({ shareUrl: url }),

  // Probe actions
  setProbeConfig: (patch) =>
    set((s) => ({ probeConfig: { ...s.probeConfig, ...patch } })),
  setProbeActive: (v) => set({ probeActive: v }),
  appendProbePoint: (pt) =>
    set((s) => ({ probeTrail: [...s.probeTrail, pt] })),
  setProbeClassification: (c) => set({ probeClassification: c }),
  resetProbe: () =>
    set({
      probeActive: false,
      probeTrail: [],
      probeClassification: null,
    }),
}));
