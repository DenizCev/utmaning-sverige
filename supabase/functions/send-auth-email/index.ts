import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { to, type, confirmationUrl } = await req.json();

    if (!to || !type) {
      return new Response(
        JSON.stringify({ error: "Fält 'to' och 'type' krävs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject: string;
    let html: string;

    if (type === "verification") {
      subject = "Bekräfta din e-postadress – Kampen Sverige";
      html = `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f23; color: #e2e8f0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 32px; border: 1px solid #2a2a4a;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #fbbf24; font-size: 24px; margin: 0;">🏆 Kampen Sverige</h1>
    </div>
    <h2 style="color: #f1f5f9; font-size: 18px;">Välkommen!</h2>
    <p style="color: #94a3b8; line-height: 1.6;">
      Tack för att du registrerade dig hos Kampen Sverige! Klicka på knappen nedan för att bekräfta din e-postadress och komma igång.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${confirmationUrl}" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1a2e; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
        Bekräfta e-postadress
      </a>
    </div>
    <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
      Om du inte skapade detta konto kan du ignorera detta meddelande.
    </p>
    <hr style="border: none; border-top: 1px solid #2a2a4a; margin: 24px 0;">
    <p style="color: #475569; font-size: 12px; text-align: center;">
      © Kampen Sverige – Tävla. Utmana. Vinn.
    </p>
  </div>
</body>
</html>`;
    } else if (type === "recovery") {
      subject = "Återställ ditt lösenord – Kampen Sverige";
      html = `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f23; color: #e2e8f0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 32px; border: 1px solid #2a2a4a;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #fbbf24; font-size: 24px; margin: 0;">🏆 Kampen Sverige</h1>
    </div>
    <h2 style="color: #f1f5f9; font-size: 18px;">Återställ lösenord</h2>
    <p style="color: #94a3b8; line-height: 1.6;">
      Du har begärt att återställa ditt lösenord. Klicka på knappen nedan för att välja ett nytt lösenord.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${confirmationUrl}" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1a2e; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
        Återställ lösenord
      </a>
    </div>
    <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
      Om du inte begärde detta kan du ignorera detta meddelande. Länken är giltig i 1 timme.
    </p>
    <hr style="border: none; border-top: 1px solid #2a2a4a; margin: 24px 0;">
    <p style="color: #475569; font-size: 12px; text-align: center;">
      © Kampen Sverige – Tävla. Utmana. Vinn.
    </p>
  </div>
</body>
</html>`;
    } else {
      return new Response(
        JSON.stringify({ error: "Ogiltig typ. Använd 'verification' eller 'recovery'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Kampen Sverige <sverigekampen@kampen.app>",
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Kunde inte skicka mail", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    const message = error instanceof Error ? error.message : "Okänt fel";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
