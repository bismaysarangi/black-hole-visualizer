export interface BlackHoleConfig {
  mass: number;
  spin: number;
  accretion_rate: number;
  inclination: number;
  hawking_on: boolean;
  time_dilation: boolean;
}

export interface LensingResult {
  einstein_radius: number;
  deflection_angle: number;
  photon_sphere_radius: number;
  shadow_radius: number;
}

export interface TimeDilationResult {
  r_observer: number;
  time_factor: number;
  proper_time_ratio: number;
}

export interface RayPath {
  ray_id: number;
  points: [number, number][];
  deflected: boolean;
  captured: boolean;
}

export interface FullAnalysis {
  lensing: LensingResult;
  time_dilation: TimeDilationResult;
  doppler: {
    approaching_factor: number;
    receding_factor: number;
  };
  rays: RayPath[];
  config: BlackHoleConfig;
}

export interface SimulationConfig extends BlackHoleConfig {
  id?: string;
  name?: string;
}

export interface ProbeConfig {
  startR: number;   // starting radius in Schwarzschild-radius units
  angle: number;    // velocity angle in degrees (0=radial-in, 90=tangential, 180=radial-out)
  speed: number;    // initial speed as fraction of c
}

export type OrbitClassification =
  | "pending"
  | "stable_orbit"
  | "escape"
  | "capture";
