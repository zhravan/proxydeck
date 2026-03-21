import { useEffect, useState } from "react";
import type { ProxyConfig, Site } from "../../types/proxy";
import { getConfigCurrent, postConfigApply, postConfigValidate } from "../../services/config";

const emptyConfig: ProxyConfig = { sites: [] };

export type SitesViewMode = "cards" | "table";

export function useSites() {
  const [config, setConfig] = useState<ProxyConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<SitesViewMode>("cards");
  const [validateResult, setValidateResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    getConfigCurrent()
      .then((r) => r.json())
      .then((data) => setConfig(data?.sites ? data : emptyConfig))
      .catch(() => setConfig(emptyConfig))
      .finally(() => setLoading(false));
  }, []);

  const addSite = () => {
    const newSite: Site = {
      hostnames: [""],
      routes: [{ match: "/", matchType: "path", upstreams: [{ address: "localhost:8080" }] }],
    };
    setConfig({ sites: [...config.sites, newSite] });
  };

  const removeSite = (index: number) => {
    setConfig({ sites: config.sites.filter((_, i) => i !== index) });
  };

  const updateSite = (index: number, site: Site) => {
    const next = [...config.sites];
    next[index] = site;
    setConfig({ sites: next });
  };

  const validate = () => {
    setValidateResult(null);
    postConfigValidate(config)
      .then((r) => r.json())
      .then(setValidateResult)
      .catch((e) => setValidateResult({ valid: false, error: e.message }));
  };

  const apply = () => {
    setApplyResult(null);
    setValidateResult(null);
    postConfigApply(config)
      .then((r) => r.json())
      .then(setApplyResult)
      .catch((e) => setApplyResult({ ok: false, error: e.message }));
  };

  return {
    config,
    loading,
    viewMode,
    setViewMode,
    validateResult,
    applyResult,
    addSite,
    removeSite,
    updateSite,
    validate,
    apply,
  };
}
