import { create } from "zustand";
import type { BlackHoleConfig, FullAnalysis } from "../types/blackhole";

interface SimulationStore {
  config: BlackHoleConfig;
  analysis: FullAnalysis | null;
  isLoading: boolean;
  isStreaming: boolean;
  activeTab: "controls" | "catalog" | "history";
  showShareModal: boolean;
  shareUrl: string | null;

  setConfig: (patch: Partial<BlackHoleConfig>) => void;
  setAnalysis: (a: FullAnalysis) => void;
  setLoading: (v: boolean) => void;
  setStreaming: (v: boolean) => void;
  setActiveTab: (t: "controls" | "catalog" | "history") => void;
  setShowShareModal: (v: boolean) => void;
  setShareUrl: (url: string | null) => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  config: {
    mass: 10.0,
    spin: 0.5,
    accretion_rate: 0.5,
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

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  setAnalysis: (a) => set({ analysis: a }),
  setLoading: (v) => set({ isLoading: v }),
  setStreaming: (v) => set({ isStreaming: v }),
  setActiveTab: (t) => set({ activeTab: t }),
  setShowShareModal: (v) => set({ showShareModal: v }),
  setShareUrl: (url) => set({ shareUrl: url }),
}));
