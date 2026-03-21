import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userFromAuthPayload, parseGetSessionUser } from "../../lib/authSession";
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const rememberEl = form.elements.namedItem("rememberMe");
    const rememberMe =
      rememberEl instanceof HTMLInputElement && rememberEl.type === "checkbox" ? rememberEl.checked : false;
    const res = await signInUsername({
      username: (form.elements.namedItem("username") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      callbackURL: "/",
      rememberMe,
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
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const err = data?.error;
    const msg =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : typeof data?.message === "string"
          ? data.message
          : "Sign in failed";
    setError(msg);
  }

  return { error, loading, allowSignup, checkingSession, handleSubmit };
}
