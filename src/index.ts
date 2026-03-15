import { Elysia } from "elysia";
import { auth } from "./auth/config";

const PORT = process.env.PORT ?? "3000";

const app = new Elysia()
  .get("/", () => "Proxydeck")
  .all("/api/auth/*", async ({ request }) => auth.handler(request))
  .listen(PORT);

console.log(`Server at http://localhost:${PORT}`);

export type App = typeof app;
