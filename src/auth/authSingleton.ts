import { betterAuth } from "better-auth";

type AuthInstance = ReturnType<typeof betterAuth>;

let authRef: AuthInstance | undefined;

/** Stores the initialized Better Auth instance. */
export function setAuth(instance: unknown): void {
  authRef = instance as AuthInstance;
}

export function getAuth(): AuthInstance {
  if (!authRef) {
    throw new Error("Auth not initialized; initAuth() must run after database migrations.");
  }
  return authRef;
}
