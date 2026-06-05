import axios from "axios";
import type { BlackHoleConfig, FullAnalysis } from "../types/blackhole";
import type { NASACatalog } from "../types/nasa";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

export const physicsAPI = {
  fullAnalysis: (config: BlackHoleConfig): Promise<FullAnalysis> =>
    api.post("/api/physics/full-analysis", config).then((r) => r.data),

  lensing: (config: BlackHoleConfig) =>
    api.post("/api/physics/lensing", config).then((r) => r.data),

  timeDilation: (config: BlackHoleConfig, r_observer: number) =>
    api
      .post(`/api/physics/time-dilation?r_observer=${r_observer}`, config)
      .then((r) => r.data),

  raytrace: (config: BlackHoleConfig, n_rays = 20) =>
    api
      .post(`/api/physics/raytrace?n_rays=${n_rays}`, config)
      .then((r) => r.data),
};

export const nasaAPI = {
  catalog: (): Promise<NASACatalog> =>
    api.get("/api/nasa/catalog").then((r) => r.data),

  blackhole: (name: string) =>
    api.get(`/api/nasa/blackhole/${name}`).then((r) => r.data),
};

export const simulationAPI = {
  save: (config: BlackHoleConfig & { name?: string }) =>
    api.post("/api/simulation/save", config).then((r) => r.data),

  load: (id: string) =>
    api.get(`/api/simulation/load/${id}`).then((r) => r.data),

  list: () => api.get("/api/simulation/list").then((r) => r.data),

  share: (id: string) =>
    api.post(`/api/simulation/share/${id}`).then((r) => r.data),

  loadByToken: (token: string) =>
    api.get(`/api/simulation/share/${token}`).then((r) => r.data),
};

export default api;
