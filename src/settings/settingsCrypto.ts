import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const VERSION_PREFIX = "pd:v1:";
const KDF_SALT = "proxydeck-smtp-secret";

function deriveKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY or BETTER_AUTH_SECRET (at least 16 characters) is required to store SMTP passwords.",
    );
  }
  return scryptSync(secret, KDF_SALT, 32);
}

export function encryptSecret(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, enc]);
  return `${VERSION_PREFIX}${combined.toString("base64url")}`;
}

export function decryptSecret(stored: string): string | null {
  if (!stored.startsWith(VERSION_PREFIX)) return null;
  try {
    const combined = Buffer.from(stored.slice(VERSION_PREFIX.length), "base64url");
    const iv = combined.subarray(0, 12);
    const tag = combined.subarray(12, 28);
    const enc = combined.subarray(28);
    const key = deriveKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
