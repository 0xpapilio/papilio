// Waitlist signup. No database: the record is a Contact in Resend (see resend.com/audience),
// and Resend also sends the confirmation email. Runs as a serverless function on Netlify.
//
// ponytail: no rate limiting. Anyone can POST any address and trigger one confirmation email to it.
// The honeypot stops dumb bots only; add Netlify rate limiting or a captcha if this gets abused.

import { html, subject, text } from "@/lib/waitlist-email";

const RESEND = "https://api.resend.com";
const FROM = process.env.RESEND_FROM ?? "Papilio <onboarding@resend.dev>";

const json = (body: object, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return json({ error: "The waitlist isn't set up yet. Try again soon." }, 503);

  const body = await request.json().catch(() => null);
  if (body?.company) return json({ ok: true }); // honeypot field: humans never fill it

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json({ error: "That email doesn't look right." }, 400);

  const resend = (path: string, data?: object) =>
    fetch(RESEND + path, {
      method: data ? "POST" : "GET",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: data && JSON.stringify(data),
    });

  // Already on the list: say yes, but don't email again (Resend accepts duplicate creates).
  if ((await resend(`/contacts/${encodeURIComponent(email)}`)).ok) return json({ ok: true, already: true });

  // 1. Record the signup.
  const contact = await resend("/contacts", { email });
  if (!contact.ok) {
    console.error("Resend contact failed", contact.status, await contact.text());
    return json({ error: "Couldn't add you right now. Try again." }, 502);
  }

  // 2. Confirm by email. They're already recorded, so a failed send is logged, not shown.
  const mail = await resend("/emails", {
    from: FROM,
    to: email,
    subject,
    text,
    html,
  });
  if (!mail.ok) console.error("Resend email failed", mail.status, await mail.text());

  return json({ ok: true });
}
