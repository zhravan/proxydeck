import { setAuth } from "./authSingleton";
import { buildBetterAuth } from "./buildBetterAuth";

export async function initAuth(): Promise<void> {
  const auth = await buildBetterAuth();
  setAuth(auth);
}
