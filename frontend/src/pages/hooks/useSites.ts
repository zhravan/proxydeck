import { useEffect, useRef, useState } from "react";
import type { ProxyConfig, Site } from "../../types/proxy";
import { getConfigCurrent, postConfigApply, postConfigValidate } from "../../services/config";

const emptyConfig: ProxyConfig = { sites: [] };

export type SitesViewMode = "cards" | "table";

type ApplyResponse = { ok: boolean; error?: string };

/** Default template for the add-site modal on the Sites page. */
export function createEmptySite(): Site {
  return {
    hostnames: [""],
    routes: [{ match: "/", matchType: "path", upstreams: [{ address: "localhost:8080" }] }],
  };
}

export type UseSitesOptions = {
  /** When set, appended once after /api/config/current loads (e.g. from domain → Sites flow). */
  pendingSite?: Site | null;
};

function hostnamesOverlapExisting(loaded: ProxyConfig, pending: Site): boolean {
  const existing = new Set(
    loaded.sites.flatMap((s) => s.hostnames.map((h) => h.trim().toLowerCase())).filter(Boolean)
  );
  return pending.hostnames.some((h) => existing.has(h.trim().toLowerCase()));
}

export function useSites(options?: UseSitesOptions) {
  const [capturedPendingSite] = useState(() => options?.pendingSite ?? null);
  const appendDoneRef = useRef(false);

  const [config, setConfig] = useState<ProxyConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [viewMode, setViewMode] = useState<SitesViewMode>("cards");
  const [validateResult, setValidateResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null);
  const [draftHostnamesOverlap, setDraftHostnamesOverlap] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getConfigCurrent()
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const loaded: ProxyConfig = data?.sites ? data : emptyConfig;
        if (capturedPendingSite && !appendDoneRef.current) {
          appendDoneRef.current = true;
          if (hostnamesOverlapExisting(loaded, capturedPendingSite)) {
            setDraftHostnamesOverlap(true);
          }
          setConfig({ sites: [...loaded.sites, capturedPendingSite] });
        } else {
          setConfig(loaded);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (capturedPendingSite && !appendDoneRef.current) {
          appendDoneRef.current = true;
          setConfig({ sites: [capturedPendingSite] });
        } else {
          setConfig(emptyConfig);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [capturedPendingSite]);

  /** Default template for a new proxy site (used by the add-site modal). */
  const appendSite = (site: Site) => {
    setValidateResult(null);
    setApplyResult(null);
    setConfig({ sites: [...config.sites, site] });
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
    draftHostnamesOverlap,
    appendSite,
    removeSite,
    updateSite,
    validate,
    apply,
  };
}
