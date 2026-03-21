import { useLogin } from "./hooks/useLogin";

export function Login() {
  const { error, loading, allowSignup, checkingSession, handleSubmit } = useLogin();

  if (checkingSession) {
    return (
      <div className="pd-auth-shell">
        <div className="card p-4" style={{ maxWidth: "24rem", width: "100%" }}>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-auth-shell">
      <div style={{ maxWidth: "24rem", width: "100%" }}>
        <article className="card p-4">
          <header className="mb-4">
            <h1>Sign in</h1>
            <p className="text-light">Enter your credentials to access Proxydeck.</p>
          </header>
          <form onSubmit={handleSubmit} className="vstack gap-4">
            <div data-field>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="Your username"
              />
            </div>
            <div data-field>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Your password"
              />
            </div>
            <div data-field className="hstack gap-2" style={{ alignItems: "center" }}>
              <input id="rememberMe" name="rememberMe" type="checkbox" />
              <label htmlFor="rememberMe" style={{ marginBlock: 0, fontWeight: "normal" }}>
                Remember me on this device
              </label>
            </div>
            {error && (
              <div role="alert" data-variant="danger">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {allowSignup && (
            <p className="text-light pd-stack-divider" style={{ marginBlockEnd: 0 }}>
              First time? <a href="/signup">Create an account</a>
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
