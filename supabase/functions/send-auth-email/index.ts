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
    let text: string;

    if (type === "verification") {
      subject = "Bekräfta din e-postadress";
      text = `Välkommen till Kampen Sverige!\n\nTack för att du registrerade dig. Bekräfta din e-postadress genom att klicka på länken nedan:\n\n${confirmationUrl}\n\nOm du inte skapade detta konto kan du ignorera detta meddelande.\n\nMed vänliga hälsningar,\nKampen Sverige`;
      html = `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:8px;max-width:480px;width:100%;">
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <p style="font-size:22px;font-weight:bold;color:#1a1a2e;margin:0;">Kampen Sverige</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px;color:#333333;margin:0 0 16px;">Hej!</p>
              <p style="font-size:15px;color:#555555;line-height:1.6;margin:0 0 24px;">
                Tack för att du registrerade dig hos Kampen Sverige. Klicka på knappen nedan för att bekräfta din e-postadress och komma igång.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:6px;background-color:#fbbf24;" align="center">
                    <a href="${confirmationUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#1a1a2e;font-size:16px;font-weight:bold;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">Bekräfta e-postadress</a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#888888;line-height:1.5;margin:24px 0 0;">
                Om du inte skapade detta konto kan du ignorera detta meddelande.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #eeeeee;text-align:center;">
              <p style="font-size:12px;color:#aaaaaa;margin:0;">Kampen Sverige – kampen.app</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else if (type === "recovery") {
      subject = "Återställ ditt lösenord";
      text = `Hej!\n\nDu har begärt att återställa ditt lösenord hos Kampen Sverige. Klicka på länken nedan:\n\n${confirmationUrl}\n\nOm du inte begärde detta kan du ignorera meddelandet. Länken är giltig i 1 timme.\n\nMed vänliga hälsningar,\nKampen Sverige`;
      html = `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:8px;max-width:480px;width:100%;">
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <p style="font-size:22px;font-weight:bold;color:#1a1a2e;margin:0;">Kampen Sverige</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px;color:#333333;margin:0 0 16px;">Hej!</p>
              <p style="font-size:15px;color:#555555;line-height:1.6;margin:0 0 24px;">
                Du har begärt att återställa ditt lösenord. Klicka på knappen nedan för att välja ett nytt lösenord.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:6px;background-color:#fbbf24;" align="center">
                    <a href="${confirmationUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#1a1a2e;font-size:16px;font-weight:bold;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">Återställ lösenord</a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#888888;line-height:1.5;margin:24px 0 0;">
                Om du inte begärde detta kan du ignorera meddelandet. Länken är giltig i 1 timme.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #eeeeee;text-align:center;">
              <p style="font-size:12px;color:#aaaaaa;margin:0;">Kampen Sverige – kampen.app</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
        from: "Kampen Sverige <noreply@kampen.app>",
        reply_to: "support@kampen.app",
        to: [to],
        subject,
        html,
        text,
        headers: {
          "X-Entity-Ref-ID": crypto.randomUUID(),
        },
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
