import { Elysia } from "elysia";
import { getAuth } from "../auth/authSingleton";
import { apiAuthGuard } from "../middleware/apiAuthGuard";
import { requestLogPlugin } from "../middleware/requestLog";
import { domainRoutes } from "../controllers/domain.controller";
import { configApiRoutes } from "../controllers/configApi.controller";
import { infrastructureServerRoutes } from "../controllers/infrastructureServer.controller";
import { appSettingsRoutes } from "../controllers/appSettings.controller";
import { userRoutes } from "../controllers/user.controller";
import { systemRoutes } from "../controllers/system.controller";
import { openapiDocsPlugin } from "../plugins/openapiDocs";
import { createSpaStaticHandler } from "../static/spaStatic";
export function createApp(frontendDistDir: string) {
  const serveStatic = createSpaStaticHandler(frontendDistDir);
  const forwardAuth = (request: Request) => getAuth().handler(request);
  return new Elysia().use(requestLogPlugin()).onBeforeHandle(apiAuthGuard)
    .use(domainRoutes).use(infrastructureServerRoutes).use(configApiRoutes)
    .use(appSettingsRoutes).use(userRoutes).use(systemRoutes).use(openapiDocsPlugin())
    .get("/api/auth/*",({request})=>forwardAuth(request),{parse:"none"})
    .post("/api/auth/*",({request})=>forwardAuth(request),{parse:"none"})
    .options("/api/auth/*",({request})=>forwardAuth(request),{parse:"none"})
    .get("/*",({request})=>{
      const pathname=new URL(request.url).pathname;
      if(pathname.startsWith("/api")) return;
      const res=serveStatic(pathname); if(res) return res;
      const indexRes=serveStatic("/index.html");
      return indexRes ?? new Response("Not Found",{status:404});
    });
}
