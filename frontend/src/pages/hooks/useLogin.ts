import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { readStoredSession, SESSION_KEY } from "../../lib/sessionStorage";
import { getAllowSignup, getSession, signInUsername } from "../../services/auth";

export function useLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowSignup, setAllowSignup] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (readStoredSession()) {
      navigate("/", { replace: true });
      return;
    }
    getSession()
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
    if (checkingSession) return;
    getAllowSignup()
      .then((r) => r.json())
      .then((d) => setAllowSignup(d?.allowSignup === true))
      .catch(() => setAllowSignup(false));
  }, [checkingSession]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const res = await signInUsername({
      username: (form.elements.namedItem("username") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      callbackURL: "/",
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const session = data?.user ?? data?.data ?? data;
      if (session) {
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: session }));
        } catch (_) {}
      }
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data?.error?.message || "Sign in failed");
  }

  return { error, loading, allowSignup, checkingSession, handleSubmit };
}
