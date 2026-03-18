import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SESSION_KEY = "pd_session";

function readStoredSession(): unknown {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d?.user ?? d?.data ?? d ?? null;
  } catch {
    return null;
  }
}

export function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowSignup, setAllowSignup] = useState<boolean | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    if (readStoredSession()) {
      navigate("/", { replace: true });
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setInviteToken(token);
      fetch(`/api/invites/check/${token}`)
        .then((r) => {
          if (!r.ok) throw new Error("Invalid or expired invite");
          return r.json();
        })
        .then((d) => {
          setInviteInfo(d);
          setAllowSignup(true);
        })
        .catch((e) => {
          setError(e.message);
          setAllowSignup(false);
        });
    }

    fetch("/api/auth/get-session", { credentials: "include" })
      .then((r) => r.text())
      .then((text) => {
        const d = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
        const session = d?.data ?? d?.session ?? d ?? null;
        if (session) navigate("/", { replace: true });
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false));
  }, [navigate]);

  useEffect(() => {
    if (checkingSession || inviteToken) return;
    fetch("/api/allow-signup", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllowSignup(d?.allowSignup === true))
      .catch(() => setAllowSignup(false));
  }, [checkingSession, inviteToken]);

  useEffect(() => {
    if (allowSignup === false) navigate("/login", { replace: true });
  }, [allowSignup, navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const res = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: (form.elements.namedItem("name") as HTMLInputElement).value,
        email: (form.elements.namedItem("email") as HTMLInputElement).value,
        username: (form.elements.namedItem("username") as HTMLInputElement).value,
        password: (form.elements.namedItem("password") as HTMLInputElement).value,
        callbackURL: "/",
      }),
      credentials: "include",
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const session = data?.user ?? data?.data ?? data;
      if (session) {
        try {
          sessionStorage.setItem("pd_session", JSON.stringify({ user: session }));
        } catch (_) {}
      }
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data?.error?.message || "Sign up failed");
  }

  if (checkingSession || allowSignup === null) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: "100vh", padding: "var(--space-6)" }}>
        <div className="card p-4" style={{ maxWidth: "24rem", width: "100%" }}>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: "100vh", padding: "var(--space-6)" }}>
      <div style={{ maxWidth: "24rem", width: "100%" }}>
        <article className="card p-4">
          <header className="mb-4">
            <h1>Create account</h1>
            {inviteInfo ? (
              <p className="text-light">
                You've been invited as <strong>{inviteInfo.email}</strong> with role <strong>{inviteInfo.role}</strong>.
              </p>
            ) : (
              <p className="text-light">One-time setup. Only one user is allowed.</p>
            )}
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
          <p className="text-light mt-4 pt-4" style={{ borderTop: "1px solid var(--border)", marginBlockEnd: 0 }}>
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </article>
      </div>
    </div>
  );
}
