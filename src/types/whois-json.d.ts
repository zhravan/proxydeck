declare module "whois-json" {
  type WhoisOptions = Record<string, unknown>;
  function whois(domain: string, options?: WhoisOptions): Promise<unknown>;
  export default whois;
}
