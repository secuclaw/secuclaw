/**
 * React hooks for knowledge base access (MITRE ATT&CK, SCF)
 */
import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../api/client';

interface MITRETactic {
  id: string;
  name: string;
  description: string;
}

interface MITRETechnique {
  id: string;
  name: string;
  tacticId: string;
  description: string;
  detection: string;
  mitigations: string[];
}

interface SCFDomain {
  id: string;
  code: string;
  name: string;
  description: string;
  controlCount: number;
}

interface SCFControl {
  id: string;
  domainCode: string;
  name: string;
  description: string;
  requirements: string[];
  mappings: Record<string, string>;
}

interface UseMITREReturn {
  tactics: MITRETactic[];
  techniques: MITRETechnique[];
  loading: boolean;
  error: string | null;
  searchTechniques: (query: string) => Promise<MITRETechnique[]>;
  getTechniquesByTactic: (tacticId: string) => Promise<void>;
}

export function useMITRE(): UseMITREReturn {
  const [tactics, setTactics] = useState<MITRETactic[]>([]);
  const [techniques, setTechniques] = useState<MITRETechnique[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const api = getApiClient();
        const [tacticsRes, techniquesRes] = await Promise.all([
          api.getTactics(),
          api.getTechniques(),
        ]);

        if (tacticsRes.success && tacticsRes.data) {
          setTactics(tacticsRes.data);
        }
        if (techniquesRes.success && techniquesRes.data) {
          setTechniques(techniquesRes.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load MITRE data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const searchTechniques = useCallback(async (query: string): Promise<MITRETechnique[]> => {
    try {
      const api = getApiClient();
      const res = await api.searchTechniques(query);
      if (res.success && res.data) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const getTechniquesByTactic = useCallback(async (tacticId: string) => {
    setLoading(true);
    try {
      const api = getApiClient();
      const res = await api.getTechniques(tacticId);
      if (res.success && res.data) {
        setTechniques(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load techniques');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tactics,
    techniques,
    loading,
    error,
    searchTechniques,
    getTechniquesByTactic,
  };
}

interface UseSCFReturn {
  domains: SCFDomain[];
  controls: SCFControl[];
  loading: boolean;
  error: string | null;
  getControlsByDomain: (domainId: string) => Promise<void>;
}

export function useSCF(): UseSCFReturn {
  const [domains, setDomains] = useState<SCFDomain[]>([]);
  const [controls, setControls] = useState<SCFControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const api = getApiClient();
        const [domainsRes, controlsRes] = await Promise.all([
          api.getSCFDomains(),
          api.getSCFControls(),
        ]);

        if (domainsRes.success && domainsRes.data) {
          setDomains(domainsRes.data);
        }
        if (controlsRes.success && controlsRes.data) {
          setControls(controlsRes.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load SCF data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getControlsByDomain = useCallback(async (domainId: string) => {
    setLoading(true);
    try {
      const api = getApiClient();
      const res = await api.getSCFControls(domainId);
      if (res.success && res.data) {
        setControls(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load controls');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    domains,
    controls,
    loading,
    error,
    getControlsByDomain,
  };
}

interface UseKnowledgeBaseReturn extends UseMITREReturn, UseSCFReturn {
  mitre: UseMITREReturn;
  scf: UseSCFReturn;
}

export function useKnowledgeBase(): UseKnowledgeBaseReturn {
  const mitre = useMITRE();
  const scf = useSCF();

  return {
    ...mitre,
    ...scf,
    mitre,
    scf,
  };
}

export default {
  useMITRE,
  useSCF,
  useKnowledgeBase,
};
