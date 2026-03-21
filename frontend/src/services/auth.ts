import { httpGet, httpPost } from "../utils/http";

export function getSession(): Promise<Response> {
  return httpGet("/api/auth/get-session");
}

export function getAllowSignup(): Promise<Response> {
  return httpGet("/api/allow-signup");
}

export function signInUsername(payload: {
  username: string;
  password: string;
  callbackURL: string;
}): Promise<Response> {
  return httpPost("/api/auth/sign-in/username", { json: payload });
}

export function signUpEmail(payload: {
  name: string;
  email: string;
  username: string;
  password: string;
  callbackURL: string;
}): Promise<Response> {
  return httpPost("/api/auth/sign-up/email", { json: payload });
}

export function signOut(): Promise<Response> {
  return httpPost("/api/auth/sign-out");
}
