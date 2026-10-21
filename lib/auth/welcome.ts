import { siteOrigin } from "../seo/pages";
import { sendMail } from "./send-mail";

export function welcomeText(email: string): { subject: string; text: string } {
  const origin = siteOrigin();
  return {
    subject: "Welcome to plainden",
    text: [
      "Welcome to plainden.",
      "",
      `Your account email is ${email}. Free tools run in the browser. A paid plan is $5 a month for one tool, or $9 a month for every tool.`,
      "",
      `Terms: ${origin}/terms`,
      `Privacy: ${origin}/privacy`,
      `Refunds: ${origin}/refund`,
    ].join("\n"),
  };
}

export async function sendWelcomeMail(email: string): Promise<void> {
  const message = welcomeText(email);
  await sendMail({ to: email, subject: message.subject, text: message.text });
}
