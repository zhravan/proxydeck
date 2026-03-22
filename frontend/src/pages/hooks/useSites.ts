import { useEffect, useState } from "react";
import type { ProxyConfig, Site } from "../../types/proxy";
import { getConfigCurrent, postConfigApply, postConfigValidate } from "../../services/config";

const emptyConfig: ProxyConfig = { sites: [] };

export type SitesViewMode = "cards" | "table";

type ApplyResponse = { ok: boolean; error?: string };

export function useSites() {
  const [config, setConfig] = useState<ProxyConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [viewMode, setViewMode] = useState<SitesViewMode>("cards");
  const [validateResult, setValidateResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null);

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

  /** Removes a site and pushes the new config to the proxy immediately so Caddy/Traefik stay in sync. */
  const removeSite = async (index: number) => {
    const next: ProxyConfig = { sites: config.sites.filter((_, i) => i !== index) };
    setValidateResult(null);
    setApplyResult(null);
    setApplying(true);
    try {
      const r = await postConfigApply(next);
      const data = (await r.json()) as ApplyResponse;
      if (data.ok) {
        setConfig(next);
        setApplyResult({ ok: true });
      } else {
        setApplyResult({ ok: false, error: data.error ?? "Apply failed" });
      }
    } catch (e) {
      setApplyResult({
        ok: false,
        error: e instanceof Error ? e.message : "Apply failed",
      });
    } finally {
      setApplying(false);
    }
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
    setApplying(true);
    postConfigApply(config)
      .then((r) => r.json())
      .then(setApplyResult)
      .catch((e) => setApplyResult({ ok: false, error: e.message }))
      .finally(() => setApplying(false));
  };

  return {
    config,
    loading,
    applying,
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
