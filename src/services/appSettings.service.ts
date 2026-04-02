import { APIError } from "@better-auth/core/error";
import type { User } from "better-auth/types";
import {
  GLOBAL_APP_SETTINGS_ID,
  insertDefaultAppSettings,
  selectAppSettings,
  updateAppSettings,
  type AppSettingsRow,
} from "../repositories/appSettings.repository";
import { decryptSecret, encryptSecret } from "../settings/settingsCrypto";
import { sendTransactionalEmail } from "../email/smtpSend";

export type AppEmailCapabilities = {
  smtpConfigured: boolean;
  forgotPassword: boolean;
  emailVerification: boolean;
  requireVerifiedSignIn: boolean;
};

export type AppSettingsPublic = {
  forgotPasswordEnabled: boolean;
  emailVerificationEnabled: boolean;
  requireVerifiedSignIn: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFrom: string;
  smtpPasswordIsSet: boolean;
};

export type AppSettingsUpdateBody = {
  forgotPasswordEnabled?: boolean;
  emailVerificationEnabled?: boolean;
  requireVerifiedSignIn?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpFrom?: string;
  /** Omit to leave unchanged; `null` clears stored password. */
  smtpPassword?: string | null;
};

const CACHE_TTL_MS = 5000;
let cachedRow: { at: number; row: AppSettingsRow } | null = null;

function invalidateCache(): void {
  cachedRow = null;
}

export async function getAppSettingsRowFresh(): Promise<AppSettingsRow> {
  await ensureAppSettingsRow();
  const row = await selectAppSettings();
  if (!row) throw new Error("app_settings row missing after ensure");
  return row;
}

async function ensureAppSettingsRow(): Promise<void> {
  const row = await selectAppSettings();
  if (row) return;
  await insertDefaultAppSettings();
}

export async function getAppSettingsRowCached(): Promise<AppSettingsRow> {
  const now = Date.now();
  if (cachedRow && now - cachedRow.at < CACHE_TTL_MS) return cachedRow.row;
  const row = await getAppSettingsRowFresh();
  cachedRow = { at: now, row };
  return row;
}

export type SmtpTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function parsePort(port: number): number {
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error("smtpPort must be between 1 and 65535.");
  }
  return Math.trunc(port);
}

function buildSmtpFromRow(row: AppSettingsRow): SmtpTransportConfig | null {
  const host = row.smtpHost.trim();
  const from = row.smtpFrom.trim();
  if (!host || !from) return null;
  const pass = row.smtpPassEncrypted ? decryptSecret(row.smtpPassEncrypted) ?? "" : "";
  return {
    host,
    port: row.smtpPort,
    secure: row.smtpSecure,
    user: row.smtpUser.trim(),
    pass,
    from,
  };
}

export async function getEmailCapabilities(): Promise<AppEmailCapabilities> {
  const row = await getAppSettingsRowCached();
  const smtp = buildSmtpFromRow(row);
  if (!smtp) {
    return {
      smtpConfigured: false,
      forgotPassword: false,
      emailVerification: false,
      requireVerifiedSignIn: false,
    };
  }
  const needsSmtpAuth = row.smtpUser.trim().length > 0;
  const authReady = !needsSmtpAuth || smtp.pass.length > 0;
  const ready = authReady;

  return {
    smtpConfigured: ready,
    forgotPassword: ready && row.forgotPasswordEnabled,
    emailVerification: ready && row.emailVerificationEnabled,
    requireVerifiedSignIn: ready && row.emailVerificationEnabled && row.requireVerifiedSignIn,
  };
}

export function rowRequiresVerifiedSignIn(row: AppSettingsRow): boolean {
  return row.requireVerifiedSignIn && row.emailVerificationEnabled;
}

export async function getAppSettingsPublic(): Promise<AppSettingsPublic> {
  const row = await getAppSettingsRowFresh();
  return {
    forgotPasswordEnabled: row.forgotPasswordEnabled,
    emailVerificationEnabled: row.emailVerificationEnabled,
    requireVerifiedSignIn: row.requireVerifiedSignIn,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpSecure: row.smtpSecure,
    smtpUser: row.smtpUser,
    smtpFrom: row.smtpFrom,
    smtpPasswordIsSet: Boolean(row.smtpPassEncrypted),
  };
}

function assertConsistentFlags(row: AppSettingsRow): void {
  if (row.requireVerifiedSignIn && !row.emailVerificationEnabled) {
    throw new Error("requireVerifiedSignIn requires emailVerificationEnabled.");
  }
}

export async function updateAppSettingsFromUser(
  body: AppSettingsUpdateBody,
): Promise<{ settings: AppSettingsPublic; restartRecommended: boolean }> {
  const current = await getAppSettingsRowFresh();
  const merged: AppSettingsRow = {
    ...current,
    forgotPasswordEnabled: body.forgotPasswordEnabled ?? current.forgotPasswordEnabled,
    emailVerificationEnabled: body.emailVerificationEnabled ?? current.emailVerificationEnabled,
    requireVerifiedSignIn: body.requireVerifiedSignIn ?? current.requireVerifiedSignIn,
    smtpHost: body.smtpHost !== undefined ? body.smtpHost.trim() : current.smtpHost,
    smtpPort: body.smtpPort !== undefined ? parsePort(body.smtpPort) : current.smtpPort,
    smtpSecure: body.smtpSecure ?? current.smtpSecure,
    smtpUser: body.smtpUser !== undefined ? body.smtpUser.trim() : current.smtpUser,
    smtpFrom: body.smtpFrom !== undefined ? body.smtpFrom.trim() : current.smtpFrom,
    smtpPassEncrypted: current.smtpPassEncrypted,
    updatedAt: current.updatedAt,
    id: current.id,
  };

  assertConsistentFlags(merged);

  let newPassEncrypted: string | null | undefined;
  if (body.smtpPassword === null) {
    newPassEncrypted = null;
  } else if (typeof body.smtpPassword === "string" && body.smtpPassword !== "") {
    newPassEncrypted = encryptSecret(body.smtpPassword);
  }

  const patch: Parameters<typeof updateAppSettings>[0] = {
    forgotPasswordEnabled: merged.forgotPasswordEnabled,
    emailVerificationEnabled: merged.emailVerificationEnabled,
    requireVerifiedSignIn: merged.requireVerifiedSignIn,
    smtpHost: merged.smtpHost,
    smtpPort: merged.smtpPort,
    smtpSecure: merged.smtpSecure,
    smtpUser: merged.smtpUser,
    smtpFrom: merged.smtpFrom,
  };
  if (newPassEncrypted !== undefined) {
    patch.smtpPassEncrypted = newPassEncrypted;
  }

  await updateAppSettings(patch);
  invalidateCache();

  const saved = await getAppSettingsRowFresh();
  const restartRecommended =
    saved.requireVerifiedSignIn !== current.requireVerifiedSignIn ||
    saved.emailVerificationEnabled !== current.emailVerificationEnabled;

  return {
    settings: {
      forgotPasswordEnabled: saved.forgotPasswordEnabled,
      emailVerificationEnabled: saved.emailVerificationEnabled,
      requireVerifiedSignIn: saved.requireVerifiedSignIn,
      smtpHost: saved.smtpHost,
      smtpPort: saved.smtpPort,
      smtpSecure: saved.smtpSecure,
      smtpUser: saved.smtpUser,
      smtpFrom: saved.smtpFrom,
      smtpPasswordIsSet: Boolean(saved.smtpPassEncrypted),
    },
    restartRecommended,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function handleSendPasswordResetEmail(
  data: {
    user: User;
    url: string;
    token: string;
  },
  _request?: Request,
): Promise<void> {
  const row = await getAppSettingsRowFresh();
  if (!row.forgotPasswordEnabled) {
    throw APIError.from("BAD_REQUEST", {
      message: "Reset password isn't enabled",
      code: "RESET_PASSWORD_DISABLED",
    });
  }
  const smtp = buildSmtpFromRow(row);
  if (!smtp || (row.smtpUser.trim() && !smtp.pass)) {
    throw APIError.from("BAD_REQUEST", {
      message: "SMTP is not fully configured",
      code: "SMTP_NOT_CONFIGURED",
    });
  }
  const { user, url } = data;
  const subject = "Reset your Proxydeck password";
  const text = `Hi,\n\nUse this link to reset your password (valid for a limited time):\n${url}\n\nIf you did not request this, you can ignore this email.\n`;
  const html = `<p>Hi,</p><p><a href="${escapeHtml(url)}">Reset your password</a> (link expires soon).</p><p>If you did not request this, you can ignore this email.</p>`;
  await sendTransactionalEmail(smtp, { to: user.email, subject, text, html });
}

export async function handleSendVerificationEmail(
  data: {
    user: User;
    url: string;
    token: string;
  },
  _request?: Request,
): Promise<void> {
  const row = await getAppSettingsRowFresh();
  if (!row.emailVerificationEnabled) return;
  const smtp = buildSmtpFromRow(row);
  if (!smtp || (row.smtpUser.trim() && !smtp.pass)) {
    throw APIError.from("BAD_REQUEST", {
      message: "SMTP is not fully configured for verification email",
      code: "SMTP_NOT_CONFIGURED",
    });
  }
  const { user, url } = data;
  const subject = "Verify your Proxydeck email";
  const text = `Hi,\n\nConfirm your email address:\n${url}\n\nIf you did not sign up, ignore this message.\n`;
  const html = `<p>Hi,</p><p><a href="${escapeHtml(url)}">Verify your email</a>.</p><p>If you did not sign up, ignore this message.</p>`;
  await sendTransactionalEmail(smtp, { to: user.email, subject, text, html });
}

export async function logEmailCapabilitiesSummary(): Promise<void> {
  const c = await getEmailCapabilities();
  const parts: string[] = [];
  if (c.forgotPassword) parts.push("forgot-password");
  if (c.emailVerification) parts.push("verification");
  if (c.requireVerifiedSignIn) parts.push("require-verified-signin");
  if (parts.length === 0) {
    console.log("Email outbound: off (configure in Settings).");
    return;
  }
  console.log(`Email outbound: on (${parts.join(", ")}).`);
}
