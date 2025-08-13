import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! }
});
export async function notify(subject: string, html: string) {
    await transporter.sendMail({ from: process.env.EMAIL_FROM!, to: process.env.EMAIL_TO!, subject, html });
}