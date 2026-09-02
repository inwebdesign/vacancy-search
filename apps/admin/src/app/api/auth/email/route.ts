import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { Resend } from "resend";
import type { EmailOtpType } from "@supabase/supabase-js";
import { z } from "zod";

const payloadSchema = z.object({
  user: z.object({ email: z.string().email() }),
  email_data: z.object({
    token_hash: z.string(),
    email_action_type: z.string(),
    site_url: z.string(),
  }),
});

const NEXT_BY_TYPE: Record<string, string> = {
  invite: "/auth/set-password",
  recovery: "/auth/set-password",
  magiclink: "/",
  signup: "/",
  email_change_current: "/",
  email_change_new: "/",
};

const SUBJECT_BY_TYPE: Record<string, string> = {
  invite: "Pozivnica — postavi lozinku",
  recovery: "Resetovanje lozinke",
  magiclink: "Link za prijavu",
  signup: "Potvrda naloga",
  email_change_current: "Potvrda promene email adrese",
  email_change_new: "Potvrda promene email adrese",
};

function toOtpType(action: string): EmailOtpType {
  return action === "email_change_current" || action === "email_change_new"
    ? "email_change"
    : (action as EmailOtpType);
}

// Auth Hook (Authentication → Hooks → Send Email) — zamenjuje Supabase-ov
// ugrađeni mailer za SVE auth mejlove (invite, recovery, magic link, email
// change), jer template editor nije dostupan bez Pro plana i free-tier
// mailer ima vrlo mali rate limit. Sam gradi link ka server-side
// /auth/callback (Korak 4) i šalje mejl preko Resend-a.
export async function POST(request: Request) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let parsedBody: unknown;
  try {
    const wh = new Webhook(process.env.SUPABASE_AUTH_HOOK_SECRET!);
    parsedBody = wh.verify(body, headers);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const result = payloadSchema.safeParse(parsedBody);
  if (!result.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { user, email_data } = result.data;

  const otpType = toOtpType(email_data.email_action_type);
  const next = NEXT_BY_TYPE[email_data.email_action_type] ?? "/";
  const link = `${email_data.site_url}/auth/callback?token_hash=${email_data.token_hash}&type=${otpType}&next=${next}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    to: user.email,
    subject: SUBJECT_BY_TYPE[email_data.email_action_type] ?? "Verifikacija naloga",
    html: `<p><a href="${link}">Klikni ovde da nastaviš</a></p>`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({}, { status: 200 });
}
