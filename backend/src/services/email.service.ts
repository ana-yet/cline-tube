import nodemailer from "nodemailer";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";

export interface CapturedEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  createdAt: Date;
}

const capturedEmails: CapturedEmail[] = [];

export function getCapturedEmails(): CapturedEmail[] {
  return [...capturedEmails];
}

export function clearCapturedEmails(): void {
  capturedEmails.length = 0;
}

/** Lazy SMTP transport — created once on first use. */
let smtpTransport: nodemailer.Transporter | null = null;

function getSmtpTransport(): nodemailer.Transporter {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return smtpTransport;
}

interface PasswordResetEmailInput {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: PasswordResetEmailInput): Promise<void> {
  const subject = "Reset your CineTube password";
  const text = [
    "We received a request to reset your CineTube password.",
    "Use this link within one hour:",
    resetUrl,
    "If you did not request this, you can ignore this message.",
  ].join("\n\n");
  const html = [
    "<p>We received a request to reset your CineTube password.</p>",
    `<p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>`,
    "<p>This link expires in one hour. If you did not request this, you can ignore this message.</p>",
  ].join("");

  if (env.EMAIL_DELIVERY_MODE === "disabled") {
    throw new ApiError(
      503,
      "Password recovery is temporarily unavailable. Please try again later.",
      "PASSWORD_RESET_UNAVAILABLE",
    );
  }

  if (env.EMAIL_DELIVERY_MODE === "capture") {
    capturedEmails.push({ to, subject, text, html, createdAt: new Date() });
    return;
  }

  if (env.EMAIL_DELIVERY_MODE === "smtp") {
    const transport = getSmtpTransport();
    await transport.sendMail({
      from: env.EMAIL_FROM || env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return;
  }

  // Default: http mode
  const response = await fetch(env.EMAIL_DELIVERY_ENDPOINT!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.EMAIL_DELIVERY_TOKEN}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    throw new ApiError(
      503,
      "Password recovery is temporarily unavailable. Please try again later.",
      "PASSWORD_RESET_UNAVAILABLE",
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
