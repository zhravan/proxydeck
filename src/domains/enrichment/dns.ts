import { promises as dns } from "node:dns";

export type DnsBundle = {
  ipv4: string[];
  ipv6: string[];
  mx: { exchange: string; priority: number }[];
  txt: string[];
  ns: string[];
};

export async function resolveDns(hostname: string, onError: (msg: string) => void): Promise<DnsBundle> {
  const ipv4 = await dns
    .resolve4(hostname)
    .catch((e: Error) => {
      onError(`IPv4: ${e.message}`);
      return [] as string[];
    });
  const ipv6 = await dns
    .resolve6(hostname)
    .catch((e: Error) => {
      onError(`IPv6: ${e.message}`);
      return [] as string[];
    });
  const mx = await dns
    .resolveMx(hostname)
    .catch((e: Error) => {
      onError(`MX: ${e.message}`);
      return [] as { exchange: string; priority: number }[];
    });
  const txtChunks = await dns
    .resolveTxt(hostname)
    .catch((e: Error) => {
      onError(`TXT: ${e.message}`);
      return [] as string[][];
    });
  const ns = await dns
    .resolveNs(hostname)
    .catch((e: Error) => {
      onError(`NS: ${e.message}`);
      return [] as string[];
    });

  const txt = txtChunks.map((part) => (Array.isArray(part) ? part.join("") : String(part)));

  return {
    ipv4,
    ipv6,
    mx: mx.map((r) => ({ exchange: r.exchange.replace(/\.$/, ""), priority: r.priority })),
    txt,
    ns: ns.map((h) => h.replace(/\.$/, "")),
  };
}
