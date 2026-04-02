import { join } from "path";
import { appVersion } from "./appVersion";
import { initAuth } from "./auth/initAuth";
import { runMigrationsOrExit } from "./db/runMigrations";
import { logEmailCapabilitiesSummary } from "./services/appSettings.service";
import { createApp } from "./routes/createApp";

const PORT = process.env.PORT ?? "3000";
const FRONTEND_DIR = join(process.cwd(), "frontend", "dist");

await runMigrationsOrExit();
await initAuth();

const app = createApp(FRONTEND_DIR).listen(PORT);

await logEmailCapabilitiesSummary();
console.log(`Server at http://localhost:${PORT} (v${appVersion})`);

export type App = typeof app;
