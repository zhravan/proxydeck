import { Elysia } from "elysia";
import { appVersion } from "../appVersion";
import { jsonResponse } from "../http/json";
import { allowSignup } from "../auth/allow-signup";
import { getEmailCapabilities } from "../services/appSettings.service";
import { getProxyStatusSafe } from "../services/proxyStatus.service";
import { readProxyLogTail } from "../services/logs.service";
const systemOpenapi={tags:["system"]};
export const systemRoutes=new Elysia()
 .get("/api/health",()=>jsonResponse({ok:true,version:appVersion}),{detail:{...systemOpenapi,summary:"Health check"}})
 .get("/api/allow-signup",async()=>jsonResponse({allowSignup:await allowSignup()}),{detail:{...systemOpenapi,summary:"Signup allowed?"}})
 .get("/api/auth-capabilities",async()=>jsonResponse({email:await getEmailCapabilities()}),{detail:{...systemOpenapi,summary:"Auth-related feature flags"}})
 .get("/api/proxy/status",async()=>jsonResponse(await getProxyStatusSafe()),{detail:{...systemOpenapi,summary:"Proxy detection status"}})
 .get("/api/certificates",()=>jsonResponse([]),{detail:{...systemOpenapi,summary:"Certificates (stub)"}})
 .get("/api/logs",()=>jsonResponse({lines:readProxyLogTail()}),{detail:{...systemOpenapi,summary:"Recent proxy log lines"}});
