import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { appSettings } from "../db/schema";

export const GLOBAL_APP_SETTINGS_ID = "global";

export type AppSettingsRow = typeof appSettings.$inferSelect;

export async function selectAppSettings(): Promise<AppSettingsRow | null> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, GLOBAL_APP_SETTINGS_ID)).limit(1);
  return row ?? null;
}

export async function insertDefaultAppSettings(): Promise<void> {
  await db.insert(appSettings).values({ id: GLOBAL_APP_SETTINGS_ID }).onConflictDoNothing();
}

export async function updateAppSettings(
  patch: Partial<
    Pick<
      AppSettingsRow,
      | "forgotPasswordEnabled"
      | "emailVerificationEnabled"
      | "requireVerifiedSignIn"
      | "smtpHost"
      | "smtpPort"
      | "smtpSecure"
      | "smtpUser"
      | "smtpFrom"
      | "smtpPassEncrypted"
    >
  >
): Promise<void> {
  await db
    .update(appSettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(appSettings.id, GLOBAL_APP_SETTINGS_ID));
}
