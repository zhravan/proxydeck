/**
 * Wipes origin storage used by the app. Call on logout and on forced session loss (401).
 */
export function clearBrowserPersistedState(): void {
  try {
    sessionStorage.clear();
  } catch {
    /* ignore quota / privacy mode */
  }
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
}

const LOGIN_PATH = "/login";

let unauthorizedHandling = false;

function isAuthPage(): boolean {
  const p = window.location.pathname;
  return p === LOGIN_PATH || p === "/signup";
}

/**
 * Best-effort server cookie/session cleanup without using the shared http client (avoids import cycles).
 */
async function tryServerSignOut(): Promise<void> {
  try {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    /* ignore network errors */
  }
}

/**
 * When an authenticated API returns 401, clear all client state and send the user to login.
 * Deduped so parallel requests do not schedule multiple redirects.
 */
export function scheduleUnauthorizedLogout(): void {
  if (unauthorizedHandling || isAuthPage()) return;
  unauthorizedHandling = true;
  void (async () => {
    await tryServerSignOut();
    clearBrowserPersistedState();
    window.location.replace(LOGIN_PATH);
  })();
}
