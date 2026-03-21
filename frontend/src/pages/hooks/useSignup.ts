import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userFromAuthPayload, parseGetSessionUser } from "../../lib/authSession";
import { readStoredSession, SESSION_KEY } from "../../lib/sessionStorage";
import { getAllowSignup, getSession, signUpEmail } from "../../services/auth";

export function useSignup() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowSignup, setAllowSignup] = useState<boolean | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (readStoredSession()) {
      navigate("/", { replace: true });
      return;
    }
    getSession()
      .then((r) => r.text())
      .then((text) => {
        const user = parseGetSessionUser(text);
        if (user) navigate("/", { replace: true });
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

  useEffect(() => {
    if (allowSignup === false) navigate("/login", { replace: true });
  }, [allowSignup, navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const res = await signUpEmail({
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      username: (form.elements.namedItem("username") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      callbackURL: "/",
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const user = userFromAuthPayload(data);
      if (user) {
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
        } catch (_) {}
      }
      window.location.replace("/");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data?.error?.message || "Sign up failed");
  }

  return { error, loading, allowSignup, checkingSession, handleSubmit };
}
