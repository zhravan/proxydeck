import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CONTENT_TYPES: Record<string, string> = {
  html: "text/html",
  js: "application/javascript",
  css: "text/css",
  json: "application/json",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

export function createSpaStaticHandler(frontendDistDir: string) {
  return function serveStatic(pathname: string): Response | null {
    if (pathname.includes("..")) return null;
    const path = pathname === "/" ? "/index.html" : pathname;
    const filePath = join(frontendDistDir, path.replace(/^\//, ""));
    if (!existsSync(filePath)) return null;
    const body = readFileSync(filePath);
    const ext = path.split(".").pop() ?? "";
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new Response(body, { headers: { "Content-Type": contentType } });
  };
}
