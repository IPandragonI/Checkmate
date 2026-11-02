import { Resend } from "resend";

interface SendEmailOptions {
    to?: string;
    subject: string;
    text: string;
    replyTo?: string;
}

/**
 * Sends an email through Resend. The sender address is always the server-configured one;
 * user-provided addresses can only be used as Reply-To.
 */
export async function sendEmail({ to, subject, text, replyTo }: SendEmailOptions) {
    const fromMail = process.env.SMTP_FROM || process.env.SMTP_USER;
    const toMail = to ?? process.env.SMTP_TO;
    if (!process.env.SMTP_PASS || !fromMail || !toMail) {
        throw new Error("Email is not configured");
    }
    const resend = new Resend(process.env.SMTP_PASS);

    const { error } = await resend.emails.send({
        from: `Checkmate <${fromMail}>`,
        to: toMail,
        subject,
        text,
        ...(replyTo ? { replyTo } : {}),
    });
    if (error) throw new Error(error.message);
}
