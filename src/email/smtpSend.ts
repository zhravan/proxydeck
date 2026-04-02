import nodemailer from "nodemailer";
import type { SmtpTransportConfig } from "../services/appSettings.service";

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function createTransport(settings: SmtpTransportConfig) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth:
      settings.user && settings.pass
        ? { user: settings.user, pass: settings.pass }
        : undefined,
  });
}

/**
 * Sends one message using the given SMTP profile. Does not log credentials.
 */
export async function sendTransactionalEmail(
  settings: SmtpTransportConfig,
  message: TransactionalEmail,
): Promise<void> {
  const transport = createTransport(settings);
  const from = settings.from;
  try {
    await transport.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html ?? message.text,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`SMTP send failed: ${msg}`);
  }
}
