import { useCallback, useEffect, useState } from "react";
import { useAppSettings } from "./hooks/useAppSettings";

export function Settings() {
  const { settings, loading, error, saving, save, setError } = useAppSettings();
  const [forgotPasswordEnabled, setForgotPasswordEnabled] = useState(false);
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(false);
  const [requireVerifiedSignIn, setRequireVerifiedSignIn] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [clearSmtpPassword, setClearSmtpPassword] = useState(false);
  const [restartNote, setRestartNote] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForgotPasswordEnabled(settings.forgotPasswordEnabled);
    setEmailVerificationEnabled(settings.emailVerificationEnabled);
    setRequireVerifiedSignIn(settings.requireVerifiedSignIn);
    setSmtpHost(settings.smtpHost);
    setSmtpPort(String(settings.smtpPort));
    setSmtpSecure(settings.smtpSecure);
    setSmtpUser(settings.smtpUser);
    setSmtpFrom(settings.smtpFrom);
    setSmtpPassword("");
    setClearSmtpPassword(false);
  }, [settings]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setRestartNote(false);
      const port = Number.parseInt(smtpPort, 10);
      if (!Number.isFinite(port) || port < 1 || port > 65535) {
        setError("SMTP port must be between 1 and 65535.");
        return;
      }
      const body: Record<string, unknown> = {
        forgotPasswordEnabled,
        emailVerificationEnabled,
        requireVerifiedSignIn,
        smtpHost: smtpHost.trim(),
        smtpPort: port,
        smtpSecure,
        smtpUser: smtpUser.trim(),
        smtpFrom: smtpFrom.trim(),
      };
      if (clearSmtpPassword) {
        body.smtpPassword = null;
      } else if (smtpPassword.trim() !== "") {
        body.smtpPassword = smtpPassword;
      }
      const result = await save(body);
      if (result?.restartRecommended) setRestartNote(true);
      if (result) setSmtpPassword("");
    },
    [
      clearSmtpPassword,
      emailVerificationEnabled,
      forgotPasswordEnabled,
      requireVerifiedSignIn,
      save,
      setError,
      smtpFrom,
      smtpHost,
      smtpPassword,
      smtpPort,
      smtpSecure,
      smtpUser,
    ]
  );

  if (loading) {
    return (
      <>
        <header className="pd-page-header">
          <h1>Settings</h1>
          <p className="text-light">Application email and auth-related options.</p>
        </header>
        <div className="card p-4">
          <p className="text-light">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="pd-page-header">
        <h1>Settings</h1>
        <p className="text-light">
          Outbound email (SMTP) is stored in the database. The SMTP password is encrypted using{" "}
          <code>SETTINGS_ENCRYPTION_KEY</code> or <code>BETTER_AUTH_SECRET</code> (min. 16 characters).
        </p>
      </header>

      {error ? (
        <div className="card p-4 mb-4" role="alert">
          <p className="text-light" style={{ color: "var(--pd-danger, #c62828)", marginBlockEnd: 0 }}>
            {error}
          </p>
        </div>
      ) : null}

      {restartNote ? (
        <div className="card p-4 mb-4">
          <p className="text-light" style={{ marginBlockEnd: 0 }}>
            Restart the server for sign-in verification rules to fully align with Better Auth&apos;s startup config.
          </p>
        </div>
      ) : null}

      <form className="card pd-section-stack" onSubmit={(e) => void handleSubmit(e)}>
        <h2 className="mb-2" style={{ fontSize: "var(--text-4)" }}>
          Email features
        </h2>
        <label className="flex gap-2 align-center">
          <input
            type="checkbox"
            checked={forgotPasswordEnabled}
            onChange={(ev) => setForgotPasswordEnabled(ev.target.checked)}
          />
          <span>Enable forgot-password emails</span>
        </label>
        <label className="flex gap-2 align-center">
          <input
            type="checkbox"
            checked={emailVerificationEnabled}
            onChange={(ev) => setEmailVerificationEnabled(ev.target.checked)}
          />
          <span>Send verification email on sign-up</span>
        </label>
        <label className="flex gap-2 align-center">
          <input
            type="checkbox"
            checked={requireVerifiedSignIn}
            onChange={(ev) => setRequireVerifiedSignIn(ev.target.checked)}
            disabled={!emailVerificationEnabled}
          />
          <span>Require verified email before sign-in</span>
        </label>

        <h2 className="mt-4 mb-2" style={{ fontSize: "var(--text-4)" }}>
          SMTP
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="smtp-host">Host</label>
            <input
              id="smtp-host"
              className="w-100"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.example.com"
              autoComplete="off"
            />
          </div>
          <div className="row">
            <div className="col-6">
              <label htmlFor="smtp-port">Port</label>
              <input
                id="smtp-port"
                type="number"
                className="w-100"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                min={1}
                max={65535}
              />
            </div>
            <div className="col-6 flex align-end">
              <label className="flex gap-2 align-center" style={{ marginBlockEnd: "0.35rem" }}>
                <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />
                <span>TLS (SSL)</span>
              </label>
            </div>
          </div>
          <div>
            <label htmlFor="smtp-user">Username (optional)</label>
            <input
              id="smtp-user"
              className="w-100"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="smtp-from">From</label>
            <input
              id="smtp-from"
              className="w-100"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder={'Proxydeck <noreply@example.com>'}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="smtp-pass">SMTP password</label>
            <input
              id="smtp-pass"
              type="password"
              className="w-100"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder={settings?.smtpPasswordIsSet ? "Leave blank to keep current" : "Set password if required"}
              autoComplete="new-password"
            />
            <p className="text-light mt-1" style={{ fontSize: "var(--text-7)", marginBlockEnd: 0 }}>
              {settings?.smtpPasswordIsSet ? "A password is stored." : "No password stored."}
            </p>
          </div>
          <label className="flex gap-2 align-center">
            <input
              type="checkbox"
              checked={clearSmtpPassword}
              onChange={(e) => setClearSmtpPassword(e.target.checked)}
            />
            <span>Clear stored SMTP password</span>
          </label>
        </div>

        <div className="mt-4">
          <button type="submit" className="button" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </>
  );
}
