import { useCallback, useEffect, useState } from "react";
import { httpGet, httpPut } from "../../utils/http";

export type AppSettingsPublic = {
  forgotPasswordEnabled: boolean;
  emailVerificationEnabled: boolean;
  requireVerifiedSignIn: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFrom: string;
  smtpPasswordIsSet: boolean;
};

export type AppSettingsSaveResult = {
  settings: AppSettingsPublic;
  restartRecommended: boolean;
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettingsPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await httpGet("/api/settings/app");
      const data = (await res.json()) as unknown;
      if (!res.ok) {
        setError(typeof data === "object" && data && "error" in data ? String((data as { error: unknown }).error) : "Failed to load settings");
        setSettings(null);
        return;
      }
      setSettings(data as AppSettingsPublic);
    } catch {
      setError("Failed to load settings");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        const res = await httpPut("/api/settings/app", { json: body });
        const data = (await res.json()) as unknown;
        if (!res.ok) {
          const msg =
            typeof data === "object" && data && "error" in data
              ? String((data as { error: unknown }).error)
              : "Save failed";
          setError(msg);
          return null;
        }
        const parsed = data as AppSettingsSaveResult;
        setSettings(parsed.settings);
        return parsed;
      } catch {
        setError("Save failed");
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { settings, loading, error, saving, reload, save, setError };
}
