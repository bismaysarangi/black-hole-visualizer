import { useCallback, useState } from "react";
import { simulationAPI } from "../api/client";
import { useSimulationStore } from "../store/simulationStore";

export function useSimulation() {
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { config, setConfig, setShowShareModal, setShareUrl } =
    useSimulationStore();

  const saveSimulation = useCallback(
    async (name?: string) => {
      setIsSaving(true);
      setError(null);
      try {
        const result = await simulationAPI.save({ ...config, name });
        setSavedId(result.id);
        return result;
      } catch (err) {
        setError("Failed to save simulation");
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    },
    [config],
  );

  const shareSimulation = useCallback(async () => {
    try {
      let id = savedId;

      // Save first if not saved yet
      if (!id) {
        const result = await simulationAPI.save({ ...config });
        id = result.id;
        setSavedId(id);
      }

      const share = await simulationAPI.share(id!);
      setShareUrl(share.share_url);
      setShowShareModal(true);
    } catch (err) {
      setError("Failed to generate share link");
      console.error(err);
    }
  }, [config, savedId, setShareUrl, setShowShareModal]);

  const loadSimulation = useCallback(
    async (id: string) => {
      try {
        const sim = await simulationAPI.load(id);
        setConfig({
          mass: sim.mass,
          spin: sim.spin,
          accretion_rate: sim.accretion_rate,
          inclination: sim.inclination,
          hawking_on: sim.hawking_on,
          time_dilation: sim.time_dilation,
        });
        setSavedId(sim.id);
      } catch (err) {
        setError("Failed to load simulation");
        console.error(err);
      }
    },
    [setConfig],
  );

  const loadByToken = useCallback(
    async (token: string) => {
      try {
        const sim = await simulationAPI.loadByToken(token);
        setConfig({
          mass: sim.mass,
          spin: sim.spin,
          accretion_rate: sim.accretion_rate,
          inclination: sim.inclination,
          hawking_on: sim.hawking_on,
          time_dilation: sim.time_dilation,
        });
        setSavedId(sim.id);
      } catch (err) {
        setError("Failed to load shared simulation");
        console.error(err);
      }
    },
    [setConfig],
  );

  return {
    isSaving,
    savedId,
    error,
    saveSimulation,
    shareSimulation,
    loadSimulation,
    loadByToken,
  };
}
