import { AppVersionStamp } from "../components/AppVersionStamp";
import { useSignup } from "./hooks/useSignup";

export function Signup() {
  const { error, loading, allowSignup, checkingSession, handleSubmit } = useSignup();

  if (checkingSession || allowSignup === null) {
    return (
      <div className="pd-auth-shell">
        <div className="card p-4" style={{ maxWidth: "24rem", width: "100%" }}>
          <p>Loading…</p>
        </div>
        <AppVersionStamp className="text-light pd-auth-version" />
      </div>
    );
  }

  return (
    <div className="pd-auth-shell">
      <div style={{ maxWidth: "24rem", width: "100%" }}>
        <article className="card p-4">
          <header className="mb-4">
            <h1>Create account</h1>
            <p className="text-light">One-time setup. Only one user is allowed.</p>
          </header>
          <form onSubmit={handleSubmit} className="vstack gap-4">
            <div data-field>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" required autoComplete="name" placeholder="Your name" />
            </div>
            <div data-field>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
            </div>
            <div data-field>
              <label htmlFor="username">Username</label>
              <input id="username" name="username" type="text" required autoComplete="username" placeholder="Login username" />
            </div>
            <div data-field>
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required autoComplete="new-password" placeholder="Choose a password" />
            </div>
            {error && (
              <div role="alert" data-variant="danger">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p className="text-light pd-stack-divider" style={{ marginBlockEnd: 0 }}>
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </article>
        <AppVersionStamp className="text-light pd-auth-version" />
      </div>
    </div>
  );
}
