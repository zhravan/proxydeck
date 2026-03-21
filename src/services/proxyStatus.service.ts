import { detectProxy } from "../proxy/detect";

export async function getProxyStatusSafe() {
  try {
    return await detectProxy();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Detection failed";
    return { provider: null, message: msg };
  }
}
